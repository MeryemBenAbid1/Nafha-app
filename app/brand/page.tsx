import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLot, linkSeal } from "./actions";

export const dynamic = "force-dynamic";

export default async function Brand() {
  await requireRole("brand");
  const supabase = await createClient();
  const { data: lots } = await supabase
    .from("lots")
    .select("code, product, brand, origin, created_at, readings(count), nfc_tags(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Brand</h1>

      <form action={createLot} className="card grid gap-3 sm:grid-cols-5 sm:items-end">
        <div>
          <label className="label">Lot code</label>
          <input name="code" required placeholder="LOT-0042" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Product</label>
          <input name="product" required placeholder="Cambodian oud oil, 3 ml" className="input" />
        </div>
        <div>
          <label className="label">Brand</label>
          <input name="brand" required className="input" />
        </div>
        <div>
          <label className="label">Origin</label>
          <input name="origin" placeholder="Cambodia" className="input" />
        </div>
        <button className="btn sm:col-span-5 sm:w-fit">Register lot</button>
      </form>

      {!!lots?.length && (
        <form action={linkSeal} className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label">NFC seal UID (7 bytes)</label>
            <input name="uid" required placeholder="04 DE 5F 1E AC C0 40" className="input font-mono" />
          </div>
          <div>
            <label className="label">Lot</label>
            <select name="lotCode" className="input">
              {lots.map((l: any) => <option key={l.code}>{l.code}</option>)}
            </select>
          </div>
          <button className="btn-light">Link seal</button>
        </form>
      )}

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-xl">Lots</h2>
        {!lots?.length && <p className="text-sm text-plum/60">No lots yet.</p>}
        <table className="w-full text-sm">
          <tbody>
            {lots?.map((l: any) => (
              <tr key={l.code} className="border-t border-sand/50">
                <td className="py-2 pr-3 font-mono">{l.code}</td>
                <td className="pr-3">{l.product}</td>
                <td className="pr-3 text-plum/60">{l.brand}{l.origin ? ` · ${l.origin}` : ""}</td>
                <td className="pr-3 text-plum/60">{l.readings?.[0]?.count ?? 0} sniffs · {l.nfc_tags?.[0]?.count ?? 0} seals</td>
                <td><Link href={`/brand/labels/${encodeURIComponent(l.code)}`} className="underline">Print labels</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
