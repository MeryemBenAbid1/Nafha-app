import "server-only";
// Every sniff goes through here, from the fake device, the ESP32, or the "Simulate sniff" button.
// 1. Check the record's shape.  2. Look up the device.  3. Check the signature (reject if bad).
// 4. Check the counter went up and the server nonce is fresh (reject replays).  5. Save, classify, and issue a certificate.

import { createAdminClient } from "@/lib/supabase/admin";
import { checkShape, recordHash, verifyRecord, type DeviceRecord } from "@/lib/record";
import { classify } from "@/lib/classifier";
import { issueCertificate } from "@/lib/issue";

export type IngestResult = { status: number; body: Record<string, unknown> };

export async function ingestRecord(record: DeviceRecord): Promise<IngestResult> {
  const shapeError = checkShape(record);
  if (shapeError) return { status: 400, body: { error: shapeError } };

  const db = (await createAdminClient());
  const { data: device } = await db.from("devices").select("*").eq("id", record.deviceId).single();
  if (!device) return { status: 404, body: { error: `unknown device ${record.deviceId}` } };

  if (!verifyRecord(record, device.public_key)) {
    return { status: 401, body: { error: "signature check failed, record rejected" } };
  }
  if (record.counter <= device.last_counter) {
    return { status: 409, body: { error: `counter ${record.counter} is not above ${device.last_counter}, looks like a replay` } };
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
  if (!nonce) return { status: 409, body: { error: "nonce unknown, used or expired" } };

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
  if (readingError) return { status: 400, body: { error: readingError.message } };

  let result;
  try {
    result = await classify(record);
  } catch (e) {
    return { status: 502, body: { error: `reading saved, but the classifier failed: ${(e as Error).message}`, readingId: reading.id } };
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
  if (verdictError) return { status: 500, body: { error: verdictError.message } };

  // Unknown results wait for an expert before anyone gets a certificate.
  let certificateUrl: string | null = null;
  if (result.verdict !== "UNKNOWN" && !result.needsReview && result.certifiable !== false) {
    const id = await issueCertificate(db, {
      verdictId: verdict.id, verdict: result.verdict, modelVersion: result.modelVersion, record, lotCode: reading.lot_code,
    });
    certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/c/${id}`;
  }

  return { status: 200, body: {
    readingId: reading.id,
    verdict: result.verdict,
    confidence: result.confidence,
    certificateUrl,
  } };
}
