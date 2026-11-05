// Makes a key pair for a pretend device, so the fake device can sign records.
//   node scripts/make-device-key.mjs NFH-01
// Saves the private key to keys/NFH-01.json (never commit it) and prints the SQL that registers the
// device's public key. Paste that SQL into the Supabase SQL editor.
// On the real device the ATECC608 makes the key and never lets the private half out.

import { p256 } from "@noble/curves/p256";
import { bytesToHex } from "@noble/hashes/utils";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const id = process.argv[2] ?? "NFH-01";
const file = `keys/${id}.json`;
if (existsSync(file)) {
  console.error(`${file} already exists. Delete it first if you really want a new key.`);
  process.exit(1);
}
const priv = p256.utils.randomPrivateKey();
const pub = bytesToHex(p256.getPublicKey(priv, false));
mkdirSync("keys", { recursive: true });
writeFileSync(file, JSON.stringify({ deviceId: id, privateKey: bytesToHex(priv), publicKey: pub, counter: 0 }, null, 2));

console.log(`Saved ${file}\n\nRun this in Supabase > SQL Editor:\n`);
console.log(`insert into devices (id, name, public_key) values ('${id}', 'Fake device ${id}', '${pub}');`);
