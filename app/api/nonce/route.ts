// GET /api/nonce?deviceId=NFH-01 — the device calls this right before a sniff and copies the
// nonce into the signed record. Ingest accepts each nonce once, within 10 minutes.
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  const nonce = randomBytes(16).toString("hex");
  const { error } = await (await createAdminClient()).from("nonces").insert({ nonce, device_id: deviceId });
  if (error) return NextResponse.json({ error: "unknown device" }, { status: 404 });
  return NextResponse.json({ nonce });
}
