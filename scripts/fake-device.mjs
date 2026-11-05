// A pretend Nafha device. It makes up a sniff, signs it like the real device will, and sends it.
//
//   node scripts/fake-device.mjs --blend genuine            one sniff of fake genuine oud
//   node scripts/fake-device.mjs --blend random --every 5   a new random sniff every 5 seconds
//   node scripts/fake-device.mjs --tamper                   changes a number after signing (should be rejected)
//   node scripts/fake-device.mjs --replay                   resends an old counter (should be rejected)
//
// Options: --device NFH-01  --url http://localhost:3000  --blend genuine|diluted|synthetic|unknown|random
// The readings are made up. They only exist so the app can be built before the sensors arrive.

import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const deviceId = opt("device", "NFH-01");
const base = opt("url", "http://localhost:3000");
const url = base + "/api/ingest";
const every = Number(opt("every", "0"));
const keyFile = `keys/${deviceId}.json`;
const key = JSON.parse(readFileSync(keyFile, "utf8"));

const BLENDS = ["genuine", "diluted", "synthetic", "unknown"];
const SENSORS = 4;
const STEPS = 10;

// How strongly each heater step reacts to each fake blend (0 = no reaction).
function responseShape(blend, step) {
  const low = Math.exp(-((step - 2) ** 2) / 4); // peaks at low heater steps
  const high = Math.exp(-((step - 7) ** 2) / 4); // peaks at high heater steps
  if (blend === "genuine") return 0.6 * low + 0.1 * high;
  if (blend === "diluted") return 0.3 * low + 0.05 * high;
  if (blend === "synthetic") return 0.1 * low + 0.6 * high;
  return 0.02; // unknown: barely reacts
}

const noise = (s) => 1 + (Math.random() - 0.5) * s;

function makeTrace(blend) {
  const base = Array.from({ length: SENSORS * STEPS }, (_, c) => 20000 + 3000 * (c % STEPS) + 2000 * Math.floor(c / STEPS));
  const rows = [];
  for (let r = 0; r < 15; r++) {
    // rows 0-2 baseline, 3-8 sample (gas in), 9-14 purge (gas fading)
    const strength = r < 3 ? 0 : r < 9 ? 1 : Math.exp(-(r - 8) / 2);
    rows.push(base.map((b, c) => Math.round((b / Math.exp(strength * responseShape(blend, c % STEPS))) * noise(0.02))));
  }
  return rows;
}

// Same rules as lib/record.ts and the Python schema.py: drop sig, sort keys, no spaces.
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
function sign(record) {
  const { sig, ...body } = record;
  const digest = sha256(utf8ToBytes(JSON.stringify(sortKeys(body))));
  const signature = p256.sign(digest, hexToBytes(key.privateKey)).normalizeS();
  const to32 = (n) => "0x" + n.toString(16).padStart(64, "0");
  return { alg: "ES256", r: to32(signature.r), s: to32(signature.s) };
}

async function sniff() {
  const blend = opt("blend", "random") === "random" ? BLENDS[Math.floor(Math.random() * 4)] : opt("blend");
  if (!flag("replay")) key.counter += 1;
  let nonce = "offline-test";
  try {
    const n = await fetch(`${base}/api/nonce?deviceId=${encodeURIComponent(deviceId)}`);
    if (n.ok) nonce = (await n.json()).nonce;
  } catch {}
  const record = {
    v: 1,
    deviceId,
    testId: randomUUID(),
    nonce,
    counter: key.counter,
    capturedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    profile: "HP10-v1",
    env: { t: Math.round(240 + Math.random() * 20) / 10, rh: Math.round(400 + Math.random() * 50) / 10, p: 1008.6, blockT: 50.1 },
    trace: makeTrace(blend),
  };
  record.sig = sign(record);
  if (flag("tamper")) record.trace[4][0] += 500; // change one number after signing
  writeFileSync(keyFile, JSON.stringify(key, null, 2));

  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(record) });
    const out = await res.json();
    console.log(`[${blend}] counter ${record.counter} -> ${res.status}`, out);
  } catch (e) {
    console.error(`Could not reach ${url}. Is the app running (npm run dev)?`, e.message);
  }
}

await sniff();
if (every > 0) setInterval(sniff, every * 1000);
