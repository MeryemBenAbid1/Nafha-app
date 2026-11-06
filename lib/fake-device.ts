import "server-only";
// A pretend device that lives inside the server, for the "Simulate sniff" button (demo and booth).
// Same made-up readings and signing as scripts/fake-device.mjs. Its key is DEMO_DEVICE_PRIVATE_KEY,
// and its public key must be registered in the devices table as DEMO_DEVICE_ID.
// The readings are made up. Never put them in the report as results.

import { randomUUID, randomBytes } from "node:crypto";
import { p256 } from "@noble/curves/p256";
import { hexToBytes } from "@noble/hashes/utils";
import { recordHash, type DeviceRecord } from "./record";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BLENDS = ["genuine", "diluted", "synthetic", "unknown"] as const;
export type Blend = (typeof BLENDS)[number];

function responseShape(blend: Blend, step: number) {
  const low = Math.exp(-((step - 2) ** 2) / 4);
  const high = Math.exp(-((step - 7) ** 2) / 4);
  if (blend === "genuine") return 0.6 * low + 0.1 * high;
  if (blend === "diluted") return 0.3 * low + 0.05 * high;
  if (blend === "synthetic") return 0.1 * low + 0.6 * high;
  return 0.02;
}

function makeTrace(blend: Blend) {
  const base = Array.from({ length: 40 }, (_, c) => 20000 + 3000 * (c % 10) + 2000 * Math.floor(c / 10));
  const noise = () => 1 + (Math.random() - 0.5) * 0.02;
  return Array.from({ length: 15 }, (_, r) => {
    const strength = r < 3 ? 0 : r < 9 ? 1 : Math.exp(-(r - 8) / 2);
    return base.map((b, c) => Math.round((b / Math.exp(strength * responseShape(blend, c % 10))) * noise()));
  });
}

export function demoDeviceReady() {
  return Boolean(process.env.DEMO_DEVICE_ID && process.env.DEMO_DEVICE_PRIVATE_KEY);
}

/** Build and sign one fake sniff, asking the database for a fresh nonce and the next counter, like the real device. */
export async function fakeSniff(db: SupabaseClient, blend: Blend): Promise<DeviceRecord> {
  const deviceId = process.env.DEMO_DEVICE_ID!;
  const { data: device } = await db.from("devices").select("last_counter").eq("id", deviceId).single();
  const nonce = randomBytes(16).toString("hex");
  await db.from("nonces").insert({ nonce, device_id: deviceId });
  const record = {
    v: 1,
    deviceId,
    testId: randomUUID(),
    nonce,
    counter: (device?.last_counter ?? -1) + 1,
    capturedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    profile: "HP10-v1",
    env: { t: Math.round(240 + Math.random() * 20) / 10, rh: Math.round(400 + Math.random() * 50) / 10, p: 1008.6, blockT: 50.1 },
    trace: makeTrace(blend),
  } as unknown as DeviceRecord;
  const sig = p256.sign(hexToBytes(recordHash(record as unknown as Record<string, unknown>)), hexToBytes(process.env.DEMO_DEVICE_PRIVATE_KEY!)).normalizeS();
  const to32 = (n: bigint) => "0x" + n.toString(16).padStart(64, "0");
  record.sig = { alg: "ES256", r: to32(sig.r), s: to32(sig.s) };
  return record;
}
