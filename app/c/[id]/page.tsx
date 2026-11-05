import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, qrDataUrl } from "@/lib/qr";
import VerdictBadge from "@/components/VerdictBadge";
import ChainCheck from "./ChainCheck";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  GENUINE: "This sample smells like the genuine oud in our signed reference library.",
  DILUTED: "This sample looks like oud mixed with a carrier oil or solvent.",
  SYNTHETIC: "This sample looks like a synthetic oud fragrance.",
  UNKNOWN: "This sample didn't match anything we know well enough to say.",
};

// The page a buyer sees after scanning the QR code. No login.
export default async function Certificate({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tap?: string }>;
}) {
  const { id } = await params;
  const { tap } = await searchParams;
  const db = createAdminClient();
  const { data: cert } = await db
    .from("certificates")
    .select("id, created_at, body, batch_id, proof, batch_root, anchor_tx, lot_code, lots(code, product, brand, origin), verdicts(label, confidence, model_version, status, readings(record, captured_at, device_id))")
    .eq("id", id)
    .single();
  if (!cert) notFound();

  const c: any = cert;
  const v = c.verdicts;
  const reading = v.readings;
  const qr = await qrDataUrl(appUrl(`/c/${c.id}`));

  // A seal tap only counts if the tap row exists, belongs to this lot, and is fresh (made by /t a moment ago).
  let seal: { counter: number } | null = null;
  if (tap) {
    const { data: t } = await db.from("seal_taps").select("counter, created_at, nfc_tags(lot_code)").eq("id", tap).maybeSingle();
    const fresh = t && Date.now() - new Date(t.created_at).getTime() < 5 * 60 * 1000;
    if (fresh && (t as any).nfc_tags?.lot_code === c.lot_code) seal = { counter: t.counter };
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {seal && (
        <div className="card border-genuine text-sm text-genuine">✓ The NFC seal on this bottle is genuine (tap #{seal.counter}).</div>
      )}
      <div className="card space-y-3 text-center">
        <p className="text-xs uppercase tracking-widest text-plum/60">Nafha certificate</p>
        <VerdictBadge label={v.label} size="lg" />
        <p className="text-plum/90">{EXPLAIN[v.label]}</p>
        {v.confidence != null && <p className="text-sm text-plum/60">Confidence {Math.round(v.confidence * 100)}%</p>}
        {v.status === "confirmed" && <p className="text-sm text-plum/60">Confirmed by a Nafha expert</p>}
      </div>

      {c.lots && (
        <div className="card text-sm">
          <p className="font-semibold">{c.lots.product}</p>
          <p className="text-plum/60">
            {c.lots.brand}{c.lots.origin ? ` · ${c.lots.origin}` : ""} · lot <span className="font-mono">{c.lots.code}</span>
          </p>
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="text-xl">Proof</h2>
        <p className="text-sm text-plum/80">
          Tested on device <span className="font-mono">{reading.device_id}</span> at {new Date(reading.captured_at).toLocaleString()}.
        </p>
        {c.body ? (
          <ChainCheck body={c.body} record={reading.record} batchId={c.batch_id} proof={c.proof} tx={c.anchor_tx} />
        ) : (
          <p className="text-sm text-plum/60">This certificate was issued before on-chain proofs were added.</p>
        )}
        <p className="text-xs text-plum/45">Model {v.model_version}</p>
      </div>

      <div className="card flex items-center gap-4">
        <img src={qr} alt="QR code for this certificate" className="h-24 w-24" />
        <p className="text-sm text-plum/60">Share this certificate. Certificate code <span className="font-mono">{c.id}</span></p>
      </div>
    </div>
  );
}
