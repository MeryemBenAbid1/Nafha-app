import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, qrDataUrl } from "@/lib/qr";
import VerdictBadge from "@/components/VerdictBadge";
import SignatureCheck from "./SignatureCheck";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  GENUINE: "This sample smells like the genuine oud in our signed reference library.",
  DILUTED: "This sample looks like oud mixed with a carrier oil or solvent.",
  SYNTHETIC: "This sample looks like a synthetic oud fragrance.",
  UNKNOWN: "This sample didn't match anything we know well enough to say.",
};

// The page a buyer sees after scanning the QR code. No login.
export default async function Certificate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const { data: cert } = await db
    .from("certificates")
    .select("id, created_at, batch_root, anchor_tx, lot_code, lots(code, product, brand, origin), verdicts(label, confidence, model_version, status, readings(record, captured_at, device_id, devices(public_key)))")
    .eq("id", id)
    .single();
  if (!cert) notFound();

  const c: any = cert;
  const v = c.verdicts;
  const reading = v.readings;
  const qr = await qrDataUrl(appUrl(`/c/${c.id}`));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card space-y-3 text-center">
        <p className="text-xs uppercase tracking-widest text-stone-500">Nafha certificate</p>
        <VerdictBadge label={v.label} size="lg" />
        <p className="text-stone-700">{EXPLAIN[v.label]}</p>
        {v.confidence != null && <p className="text-sm text-stone-500">Confidence {Math.round(v.confidence * 100)}%</p>}
        {v.status === "confirmed" && <p className="text-sm text-stone-500">Confirmed by a Nafha expert</p>}
      </div>

      {c.lots && (
        <div className="card text-sm">
          <p className="font-semibold">{c.lots.product}</p>
          <p className="text-stone-500">
            {c.lots.brand}{c.lots.origin ? ` · ${c.lots.origin}` : ""} · lot <span className="font-mono">{c.lots.code}</span>
          </p>
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="font-semibold">Proof</h2>
        <p className="text-sm text-stone-600">
          Tested on device <span className="font-mono">{reading.device_id}</span> at {new Date(reading.captured_at).toLocaleString()}.
        </p>
        <SignatureCheck record={reading.record} publicKey={reading.devices.public_key} />
        <p className="text-sm text-stone-500">
          {c.anchor_tx
            ? <>Anchored on Polygon: <a className="underline" href={`https://amoy.polygonscan.com/tx/${c.anchor_tx}`}>{c.anchor_tx.slice(0, 12)}…</a></>
            : "On-chain anchor: not yet. It's added once the batch is anchored."}
        </p>
        <p className="text-xs text-stone-400">Model {v.model_version}</p>
      </div>

      <div className="card flex items-center gap-4">
        <img src={qr} alt="QR code for this certificate" className="h-24 w-24" />
        <p className="text-sm text-stone-500">Share this certificate. Certificate code <span className="font-mono">{c.id}</span></p>
      </div>
    </div>
  );
}
