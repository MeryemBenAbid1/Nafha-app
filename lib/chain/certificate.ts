// Certificates, Merkle leaves and the buyer page's checks.
// A TypeScript port of nafha-chain/lib/{records,merkle,certificate}.js. Keep the two in step:
// the leaf format must match NafhaAnchor/NafhaEscrow exactly (see nafha-chain/README.md, "Leaf format").
// Runs in the browser too (no node:crypto).

import canonicalize from "canonicalize";
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { recordHash, type DeviceRecord } from "../record";

export type Hex = `0x${string}`;
export const ZERO32 = ("0x" + "00".repeat(32)) as Hex;
export const VERDICT_CODE = { GENUINE: 0, DILUTED: 1, SYNTHETIC: 2, UNKNOWN: 3 } as const;
const KIND_CERT = 1;
export const LEAF_TYPES = ["uint8", "bytes32", "bytes32", "uint8", "bytes32", "bytes32"];

const h0x = (b: Uint8Array) => ("0x" + bytesToHex(b)) as Hex;
const strip = (h: string) => h.replace(/^0x/, "");

/** SHA-256 of the RFC 8785 canonical JSON. */
export function canonicalHash(obj: unknown): Hex {
  return h0x(sha256(utf8ToBytes(canonicalize(obj) as string)));
}

/** A string id ("LOT-0042", "NFH-01") as bytes32 = SHA-256 of the string. */
export function idToBytes32(id: string): Hex {
  return h0x(sha256(utf8ToBytes(String(id))));
}

/** Uncompressed public key hex (04||x||y) -> {qx, qy}. */
export function pubToXY(pubHex: string): { qx: Hex; qy: Hex } {
  const b = hexToBytes(strip(pubHex));
  if (b.length !== 65 || b[0] !== 4) throw new Error("expected an uncompressed P-256 public key");
  return { qx: h0x(b.subarray(1, 33)), qy: h0x(b.subarray(33, 65)) };
}

export type CertificateBody = {
  "@context": string[];
  type: string[];
  id: string;
  issuer: string;
  validFrom: string;
  credentialSubject: { lotId: string; product: string; sampleId: string };
  claim: { verdict: keyof typeof VERDICT_CODE; modelVersion: string };
  evidence: { deviceId: string; recordHash: Hex; testId: string; signature: { alg: "ES256"; r: string; s: string } };
};

export function makeCertificate(a: {
  certId: string;
  lotId: string;
  product: string;
  verdict: keyof typeof VERDICT_CODE;
  modelVersion: string;
  record: DeviceRecord;
}): CertificateBody {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "NafhaAuthenticityCertificate"],
    id: `urn:nafha:cert:${a.certId}`,
    issuer: process.env.NEXT_PUBLIC_NAFHA_ISSUER ?? "did:web:nafha.app",
    validFrom: a.record.capturedAt,
    credentialSubject: { lotId: a.lotId, product: a.product, sampleId: a.record.testId },
    claim: { verdict: a.verdict, modelVersion: a.modelVersion },
    evidence: {
      deviceId: a.record.deviceId,
      recordHash: ("0x" + recordHash(a.record as unknown as Record<string, unknown>)) as Hex,
      testId: a.record.testId,
      signature: { alg: "ES256", r: a.record.sig.r, s: a.record.sig.s },
    },
  };
}

export function certSummary(body: CertificateBody) {
  return {
    certHash: canonicalHash(body),
    lotId: idToBytes32(body.credentialSubject.lotId),
    verdict: VERDICT_CODE[body.claim.verdict],
    recordHash: body.evidence.recordHash,
    deviceId: idToBytes32(body.evidence.deviceId),
  };
}

export function certLeafValues(body: CertificateBody) {
  const s = certSummary(body);
  return [KIND_CERT, s.certHash, s.lotId, s.verdict, s.recordHash, s.deviceId];
}

export function buildBatch(bodies: CertificateBody[]) {
  if (!bodies.length) throw new Error("empty batch");
  const tree = StandardMerkleTree.of(bodies.map(certLeafValues), LEAF_TYPES);
  return { root: tree.root as Hex, leafCount: bodies.length, proofs: bodies.map((_, i) => tree.getProof(i) as Hex[]) };
}

export function verifyProof(root: string, body: CertificateBody, proof: string[]) {
  return StandardMerkleTree.verify(root, LEAF_TYPES, certLeafValues(body), proof);
}

/** Device signature over the record hash, with the key as {qx, qy}. */
export function verifyDeviceSignature(recordHashHex: string, sig: { r: string; s: string }, key: { qx: string; qy: string }) {
  try {
    const pub = hexToBytes("04" + strip(key.qx) + strip(key.qy));
    const signature = new p256.Signature(BigInt(sig.r), BigInt(sig.s));
    return p256.verify(signature.toCompactRawBytes(), hexToBytes(strip(recordHashHex)), pub, { lowS: false });
  } catch {
    return false;
  }
}
