import "server-only";
// NTAG 424 DNA "Secure Unique NFC" (SUN / SDM) check. Copied from nafha-chain/lib/sun.js
// (tested there against NXP AN12196's example tap). Keep the two in step.
import crypto from "node:crypto";


const ZERO16 = Buffer.alloc(16);

function aesEcb(key: Buffer, block: Buffer) {
  const c = crypto.createCipheriv("aes-128-ecb", key, null);
  c.setAutoPadding(false);
  return Buffer.concat([c.update(block), c.final()]);
}

function shiftLeft1(buf: Buffer) {
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = ((buf[i] << 1) & 0xff) | (i + 1 < buf.length ? buf[i + 1] >> 7 : 0);
  return out;
}

/** AES-CMAC (RFC 4493). */
export function aesCmac(key: Buffer, msg: Buffer) {
  const L = aesEcb(key, ZERO16);
  const Rb = 0x87;
  let K1 = shiftLeft1(L); if (L[0] & 0x80) K1[15] ^= Rb;
  let K2 = shiftLeft1(K1); if (K1[0] & 0x80) K2[15] ^= Rb;
  const n = Math.max(1, Math.ceil(msg.length / 16));
  const complete = msg.length > 0 && msg.length % 16 === 0;
  let last = Buffer.alloc(16);
  const tail = msg.subarray((n - 1) * 16);
  if (complete) { for (let i = 0; i < 16; i++) last[i] = tail[i] ^ K1[i]; }
  else { const p = Buffer.alloc(16); tail.copy(p); p[tail.length] = 0x80; for (let i = 0; i < 16; i++) last[i] = p[i] ^ K2[i]; }
  let X = Buffer.alloc(16);
  for (let b = 0; b < n - 1; b++) {
    const blk = msg.subarray(b * 16, b * 16 + 16);
    const y = Buffer.alloc(16); for (let i = 0; i < 16; i++) y[i] = X[i] ^ blk[i];
    X = aesEcb(key, y);
  }
  const y = Buffer.alloc(16); for (let i = 0; i < 16; i++) y[i] = X[i] ^ last[i];
  return aesEcb(key, y);
}

export function decryptPicc(kMeta: Buffer, piccHex: string) {
  const d = crypto.createDecipheriv("aes-128-cbc", kMeta, ZERO16);
  d.setAutoPadding(false);
  const p = Buffer.concat([d.update(Buffer.from(piccHex, "hex")), d.final()]);
  const tag = p[0];
  if ((tag & 0x80) === 0 || (tag & 0x40) === 0) throw new Error("PICC data does not mirror UID and counter");
  const uidLen = tag & 0x0f;
  const uid = p.subarray(1, 1 + uidLen);
  const ctrBytes = p.subarray(1 + uidLen, 4 + uidLen); // LSB first
  const counter = ctrBytes[0] | (ctrBytes[1] << 8) | (ctrBytes[2] << 16);
  return { uid, ctrBytes, counter };
}

/**
 * Verify one tap.
 * @param {{picc_data:string, cmac:string}} q   query parameters from the tapped URL
 * @param {{kMeta:Buffer, kFile:Buffer}} keys   per-tag (or diversified) AES-128 keys
 * @param {number} lastCounter                 highest counter seen for this tag (replay protection)
 */
export function verifySun(q: { picc_data: string; cmac: string }, keys: { kMeta: Buffer; kFile: Buffer }, lastCounter = -1) {
  const { uid, ctrBytes, counter } = decryptPicc(keys.kMeta, q.picc_data);
  const sv2 = Buffer.concat([Buffer.from("3CC300010080", "hex"), uid, ctrBytes]);
  const kSes = aesCmac(keys.kFile, sv2);
  const full = aesCmac(kSes, Buffer.alloc(0));
  const mac = Buffer.from([1, 3, 5, 7, 9, 11, 13, 15].map((i) => full[i]));
  const macOk = crypto.timingSafeEqual(mac, Buffer.from(q.cmac, "hex"));
  const fresh = counter > lastCounter;
  return { ok: macOk && fresh, macOk, fresh, uid: uid.toString("hex").toUpperCase(), counter };
}

