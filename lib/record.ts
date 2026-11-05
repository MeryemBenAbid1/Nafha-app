// The signed device record (report §5.9), shared with nafha-ml and nafha-chain.
// Hash = SHA-256 of the JCS (RFC 8785) form without "sig". For our values JSON.stringify with sorted keys
// gives exactly the JCS bytes, the same as nafha-chain/lib/records.js recordHash (test/vectors/record-v1.json).
//
// One sniff = one record. The device hashes the record WITHOUT "sig" (sorted keys, no spaces, UTF-8),
// signs that 32-byte SHA-256 digest with its P-256 key (the ATECC608 chip on the real device),
// and puts the signature in "sig". Anyone with the device's public key can check it.

import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

export type DeviceRecord = {
  v: number;
  deviceId: string;
  testId: string;
  nonce: string; // issued by the server (GET /api/nonce) right before the sniff, used once (FR-FW-03)
  counter: number;
  capturedAt: string;
  profile: string;
  env: { t?: number; rh?: number; p?: number; blockT?: number; rows?: unknown[] };
  trace: number[][]; // 15 rows x 40 (or 10) resistances in ohms
  // r and s as 0x-prefixed 32-byte hex, s in the lower half (what the on-chain P-256 check accepts).
  // Same shape as nafha-chain/lib/records.js sigToBytes32().
  sig: { alg: "ES256"; r: string; s: string };
};

// Same bytes as Python's json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) out[k] = sortKeys((value as any)[k]);
    return out;
  }
  return value;
}

export function canonicalBytes(record: Record<string, unknown>): Uint8Array {
  const { sig: _sig, ...body } = record;
  return utf8ToBytes(JSON.stringify(sortKeys(body)));
}

export function recordHash(record: Record<string, unknown>): string {
  return bytesToHex(sha256(canonicalBytes(record)));
}

// publicKeyHex: the device's uncompressed (04...) or compressed public key, as stored in the devices table.
export function verifyRecord(record: DeviceRecord, publicKeyHex: string): boolean {
  try {
    const { r, s } = record.sig ?? ({} as DeviceRecord["sig"]);
    if (!r || !s) return false;
    const signature = new p256.Signature(BigInt(r), BigInt(s));
    const digest = sha256(canonicalBytes(record as unknown as Record<string, unknown>));
    // lowS: false so a chip signature that wasn't normalised still passes here. The chain code normalises it.
    return p256.verify(signature.toCompactRawBytes(), digest, hexToBytes(publicKeyHex.replace(/^0x/, "")), { lowS: false });
  } catch {
    return false;
  }
}

// Quick shape check before we trust anything in the body.
export function checkShape(r: any): string | null {
  if (!r || typeof r !== "object") return "body is not a JSON object";
  for (const k of ["deviceId", "testId", "nonce", "capturedAt", "profile"]) {
    if (typeof r[k] !== "string" || !r[k]) return `missing ${k}`;
  }
  if (!Number.isInteger(r.counter)) return "missing counter";
  if (!Array.isArray(r.trace) || r.trace.length < 9) return "trace must have at least 9 rows";
  if (!r.trace.every((row: unknown) => Array.isArray(row) && row.every((x) => typeof x === "number" && x > 0)))
    return "trace rows must be lists of positive numbers";
  if (!r.sig || typeof r.sig !== "object") return "missing sig";
  return null;
}
