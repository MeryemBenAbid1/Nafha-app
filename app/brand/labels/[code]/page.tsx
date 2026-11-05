import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { appUrl, qrDataUrl } from "@/lib/qr";

// A printable sheet of 24 identical labels for one lot. Each QR opens /l/<code>,
// which shows the newest certificate for that lot.
export default async function Labels({ params }: { params: Promise<{ code: string }> }) {
  await requireRole("brand");
  const { code } = await params;
  const lotCode = decodeURIComponent(code);
  const supabase = await createClient();
  const { data: lot } = await supabase.from("lots").select("*").eq("code", lotCode).single();
  if (!lot) return <p>Lot not found.</p>;
  const url = appUrl(`/l/${encodeURIComponent(lot.code)}`);
  const qr = await qrDataUrl(url);

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <p className="text-sm text-stone-500">Print with your browser (Ctrl/Cmd + P). Labels link to {url}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center rounded border border-dashed border-stone-300 bg-white p-2 text-center">
            <img src={qr} alt={`QR for ${lot.code}`} className="h-24 w-24" />
            <div className="mt-1 text-xs font-semibold">Nafha verified</div>
            <div className="font-mono text-[10px] text-stone-500">{lot.code}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
