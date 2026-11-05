import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LiveRefresh from "@/components/LiveRefresh";
import VerdictBadge from "@/components/VerdictBadge";
import Sparkline from "@/components/Sparkline";
import { setActiveLot } from "./actions";

export const dynamic = "force-dynamic";

export default async function Technician() {
  await requireRole("technician");
  const supabase = await createClient();
  const [{ data: devices }, { data: lots }, { data: readings }] = await Promise.all([
    supabase.from("devices").select("id, name, active_lot_code, last_counter").order("id"),
    supabase.from("lots").select("code, product").order("created_at", { ascending: false }),
    supabase
      .from("readings")
      .select("id, device_id, lot_code, counter, captured_at, record, verdicts(id, label, confidence, status, certificates(id))")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Technician</h1>
        <LiveRefresh tables={["readings", "verdicts"]} />
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Devices</h2>
        {!devices?.length && <p className="text-sm text-stone-500">No devices yet. See the README: run npm run device:key.</p>}
        <div className="space-y-2">
          {devices?.map((d) => (
            <form key={d.id} action={setActiveLot} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="deviceId" value={d.id} />
              <span className="w-28 font-mono text-sm">{d.id}</span>
              <span className="text-sm text-stone-500">testing lot</span>
              <select name="lotCode" defaultValue={d.active_lot_code ?? ""} className="input w-auto">
                <option value="">none</option>
                {lots?.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} · {l.product}
                  </option>
                ))}
              </select>
              <button className="btn-light">Set</button>
              <span className="text-xs text-stone-400">{d.last_counter + 1} sniffs so far</span>
            </form>
          ))}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Latest sniffs</h2>
        {!readings?.length && <p className="text-sm text-stone-500">Nothing yet. Start the fake device: npm run device:fake -- --every 5</p>}
        <table className="w-full text-sm">
          <tbody>
            {readings?.map((r: any) => {
              const v = r.verdicts?.[0];
              const cert = v?.certificates?.[0];
              return (
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="py-2 pr-3 text-stone-500">{new Date(r.captured_at).toLocaleTimeString()}</td>
                  <td className="pr-3 font-mono text-xs">{r.device_id} #{r.counter}</td>
                  <td className="pr-3">{r.lot_code ?? <span className="text-stone-400">no lot</span>}</td>
                  <td className="pr-3"><Sparkline trace={r.record.trace} /></td>
                  <td className="pr-3">{v ? <VerdictBadge label={v.label} /> : "…"}</td>
                  <td className="pr-3 text-stone-500">{v ? `${Math.round(v.confidence * 100)}%` : ""}</td>
                  <td>
                    {cert ? (
                      <Link className="underline" href={`/c/${cert.id}`}>certificate</Link>
                    ) : v?.status === "needs_review" ? (
                      <span className="text-xs text-stone-500">waiting for expert</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
