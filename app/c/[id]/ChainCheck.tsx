"use client";
// The buyer's three checks, run on their own phone (port of nafha-chain verifyCertificate):
//  1. Signature: the device key is read FROM THE CHAIN and must have signed this sniff.
//  2. Integrity: the raw sniff on this page hashes to the record hash inside the certificate.
//  3. Anchored: this certificate's Merkle proof leads to the root stored ON CHAIN.
// None of these trusts the Nafha server's word.
import { useEffect, useState } from "react";
import { recordHash, type DeviceRecord } from "@/lib/record";
import { anchorAbi, chainConfig, chainReady, explorerTx, publicClient } from "@/lib/chain/contract";
import { idToBytes32, verifyDeviceSignature, verifyProof, ZERO32, type CertificateBody } from "@/lib/chain/certificate";

type Status = "checking" | "pass" | "fail" | "pending";
type Props = { body: CertificateBody; record: DeviceRecord; batchId: string | null; proof: string[] | null; tx: string | null };

const ICON: Record<Status, string> = { checking: "…", pass: "✓", fail: "✗", pending: "○" };
const COLOR: Record<Status, string> = { checking: "text-stone-500", pass: "text-genuine", fail: "text-synthetic", pending: "text-stone-500" };

export default function ChainCheck({ body, record, batchId, proof, tx }: Props) {
  const [checks, setChecks] = useState<{ name: string; status: Status; note: string }[]>([]);

  useEffect(() => {
    (async () => {
      const out: { name: string; status: Status; note: string }[] = [];
      const integrity = "0x" + recordHash(record as any) === body.evidence.recordHash;
      out.push({ name: "Sniff matches certificate", status: integrity ? "pass" : "fail", note: body.evidence.recordHash.slice(0, 18) + "…" });

      if (!chainReady()) {
        out.push({ name: "Signed by a registered device", status: "pending", note: "blockchain not connected yet" });
        out.push({ name: "Anchored on chain", status: "pending", note: "blockchain not connected yet" });
        return setChecks(out);
      }
      setChecks([...out, { name: "Reading the blockchain", status: "checking", note: "" }]);
      try {
        const client = publicClient();
        const [qx, qy, active] = await client.readContract({
          address: chainConfig.address, abi: anchorAbi, functionName: "deviceKey", args: [idToBytes32(body.evidence.deviceId)],
        });
        const sigOk = active && verifyDeviceSignature(body.evidence.recordHash, body.evidence.signature, { qx, qy });
        out.push({
          name: "Signed by a registered device",
          status: sigOk ? "pass" : active ? "fail" : "pending",
          note: active ? `${body.evidence.deviceId}, key read from chain` : "device key not on chain yet",
        });

        if (!batchId || !proof) {
          out.push({ name: "Anchored on chain", status: "pending", note: "waiting for the next batch" });
        } else {
          const root = await client.readContract({ address: chainConfig.address, abi: anchorAbi, functionName: "roots", args: [batchId as `0x${string}`] });
          const ok = root !== ZERO32 && verifyProof(root, body, proof);
          out.push({ name: "Anchored on chain", status: ok ? "pass" : "fail", note: ok ? `root ${root.slice(0, 12)}… read from contract` : "proof doesn't match the on-chain root" });
        }
      } catch (e) {
        out.push({ name: "Blockchain", status: "fail", note: `couldn't reach the chain: ${(e as Error).message.slice(0, 80)}` });
      }
      setChecks(out);
    })();
  }, [body, record, batchId, proof]);

  const link = tx ? explorerTx(tx) : null;
  return (
    <div className="space-y-2 text-sm">
      {checks.map((c) => (
        <div key={c.name} className="flex gap-2">
          <span className={`w-4 font-bold ${COLOR[c.status]}`}>{ICON[c.status]}</span>
          <div>
            <p className={COLOR[c.status]}>{c.name}</p>
            <p className="break-all font-mono text-xs text-stone-400">{c.note}</p>
          </div>
        </div>
      ))}
      {link && <a className="text-xs underline" href={link}>See the anchor transaction on Polygonscan</a>}
    </div>
  );
}
