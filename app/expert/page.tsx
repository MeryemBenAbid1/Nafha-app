import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VERDICTS } from "@/lib/verdict";
import LiveRefresh from "@/components/LiveRefresh";
import Sparkline from "@/components/Sparkline";
import VerdictBadge from "@/components/VerdictBadge";
import { addToLibrary, reviewVerdict } from "./actions";

export const dynamic = "force-dynamic";
const CLASSES = ["G-A", "G-B", "D50", "D25", "SYN", "REF", "BLANK"];

export default async function Expert() {
  await requireRole("expert");
  const supabase = await createClient();
  const [{ data: queue }, { data: recent }, { data: library }] = await Promise.all([
    supabase
      .from("verdicts")
      .select("id, label, confidence, created_at, readings(id, device_id, lot_code, record)")
      .eq("status", "needs_review")
      .order("created_at"),
    supabase
      .from("readings")
      .select("id, device_id, lot_code, captured_at, record, verdicts(label)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("reference_library").select("class"),
  ]);
  const counts = (library ?? []).reduce<Record<string, number>>((m, r) => ((m[r.class] = (m[r.class] ?? 0) + 1), m), {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Expert</h1>
        <LiveRefresh tables={["verdicts"]} />
      </div>

      <section className="card">
        <h2 className="mb-1 text-xl">Needs your review ({queue?.length ?? 0})</h2>
        <p className="mb-3 text-sm text-plum/60">The model didn't recognise these. Smell the sample and decide.</p>
        {!queue?.length && <p className="text-sm text-plum/45">Nothing waiting.</p>}
        <div className="space-y-3">
          {queue?.map((v: any) => (
            <form key={v.id} action={reviewVerdict} className="flex flex-wrap items-center gap-3 border-t border-sand/50 pt-3">
              <input type="hidden" name="verdictId" value={v.id} />
              <Sparkline trace={v.readings.record.trace} />
              <span className="text-sm">{v.readings.lot_code ?? "no lot"} · {v.readings.device_id}</span>
              <select name="label" className="input w-auto" defaultValue="UNKNOWN">
                {VERDICTS.map((x) => <option key={x}>{x}</option>)}
              </select>
              <button className="btn">Confirm</button>
            </form>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-1 text-xl">Reference library</h2>
        <p className="mb-3 text-sm text-plum/60">
          {Object.keys(counts).length ? Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(" · ") : "Empty so far."}
        </p>
        <div className="space-y-2">
          {recent?.map((r: any) => (
            <form key={r.id} action={addToLibrary} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="readingId" value={r.id} />
              <Sparkline trace={r.record.trace} />
              <span className="w-24">{r.lot_code ?? "no lot"}</span>
              {r.verdicts?.[0] && <VerdictBadge label={r.verdicts[0].label} />}
              <select name="class" className="input w-auto">
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button className="btn-light">Add to library</button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
