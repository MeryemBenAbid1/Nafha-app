// POST /api/ingest — where every sniff arrives, from the fake device now and the ESP32 later.
// 1. Check the record's shape.  2. Look up the device.  3. Check the signature (reject if bad).
// 4. Check the counter went up and the server nonce is fresh (reject replays).  5. Save, classify, and issue a certificate.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkShape, recordHash, verifyRecord, type DeviceRecord } from "@/lib/record";
import { classify } from "@/lib/classifier";
import { shortId } from "@/lib/auth";

export async function POST(req: Request) {
  let record: DeviceRecord;
  try {
    record = await req.json();
  } catch {
    return NextResponse.json({ error: "body is not JSON" }, { status: 400 });
  }
  const shapeError = checkShape(record);
  if (shapeError) return NextResponse.json({ error: shapeError }, { status: 400 });

  const db = createAdminClient();
  const { data: device } = await db.from("devices").select("*").eq("id", record.deviceId).single();
  if (!device) return NextResponse.json({ error: `unknown device ${record.deviceId}` }, { status: 404 });

  if (!verifyRecord(record, device.public_key)) {
    return NextResponse.json({ error: "signature check failed, record rejected" }, { status: 401 });
  }
  if (record.counter <= device.last_counter) {
    return NextResponse.json(
      { error: `counter ${record.counter} is not above ${device.last_counter}, looks like a replay` },
      { status: 409 },
    );
  }
  // The nonce must be one we issued to this device, unused, and less than 10 minutes old.
  const { data: nonce } = await db
    .from("nonces")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", record.nonce)
    .eq("device_id", device.id)
    .is("used_at", null)
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .select()
    .maybeSingle();
  if (!nonce) return NextResponse.json({ error: "nonce unknown, used or expired" }, { status: 409 });

  await db.from("devices").update({ last_counter: record.counter }).eq("id", device.id);

  const { data: reading, error: readingError } = await db
    .from("readings")
    .insert({
      test_id: record.testId,
      device_id: device.id,
      lot_code: device.active_lot_code,
      counter: record.counter,
      captured_at: record.capturedAt,
      record,
      record_hash: recordHash(record as unknown as Record<string, unknown>),
    })
    .select()
    .single();
  if (readingError) return NextResponse.json({ error: readingError.message }, { status: 400 });

  let result;
  try {
    result = await classify(record);
  } catch (e) {
    return NextResponse.json({ error: `reading saved, but the classifier failed: ${(e as Error).message}`, readingId: reading.id }, { status: 502 });
  }
  const { data: verdict, error: verdictError } = await db
    .from("verdicts")
    .insert({
      reading_id: reading.id,
      label: result.verdict,
      confidence: result.confidence,
      model_version: result.modelVersion,
      status: result.verdict === "UNKNOWN" || result.needsReview ? "needs_review" : "auto",
      details: result.details ?? null,
    })
    .select()
    .single();
  if (verdictError) return NextResponse.json({ error: verdictError.message }, { status: 500 });

  // Unknown results wait for an expert before anyone gets a certificate.
  let certificateUrl: string | null = null;
  if (result.verdict !== "UNKNOWN" && !result.needsReview && result.certifiable !== false) {
    const id = shortId();
    await db.from("certificates").insert({ id, verdict_id: verdict.id, lot_code: reading.lot_code });
    certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/c/${id}`;
  }

  return NextResponse.json({
    readingId: reading.id,
    verdict: result.verdict,
    confidence: result.confidence,
    certificateUrl,
  });
}
