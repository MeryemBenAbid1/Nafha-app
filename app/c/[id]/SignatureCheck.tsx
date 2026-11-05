"use client";
import { useEffect, useState } from "react";
import { recordHash, verifyRecord, type DeviceRecord } from "@/lib/record";

// Runs on the buyer's own phone, so the check doesn't depend on trusting the Nafha server's word.
export default function SignatureCheck({ record, publicKey }: { record: DeviceRecord; publicKey: string }) {
  const [state, setState] = useState<{ ok: boolean; hash: string } | null>(null);
  useEffect(() => {
    setState({ ok: verifyRecord(record, publicKey), hash: recordHash(record as any) });
  }, [record, publicKey]);
  if (!state) return <p className="text-sm text-stone-500">Checking the device signature…</p>;
  return (
    <div className="space-y-1 text-sm">
      <p className={state.ok ? "text-genuine" : "text-synthetic"}>
        {state.ok ? "✓ Signed by the device, checked on your phone" : "✗ The device signature does not match. Do not trust this certificate."}
      </p>
      <p className="break-all font-mono text-xs text-stone-500">Record hash {state.hash}</p>
    </div>
  );
}
