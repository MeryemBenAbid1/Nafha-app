"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { issueCertificate } from "@/lib/issue";
import { createAdminClient } from "@/lib/supabase/admin";

// The expert decides what an UNKNOWN sniff really was. Anything but UNKNOWN gets a certificate.
export async function reviewVerdict(formData: FormData) {
  const me = await requireRole("expert");
  const verdictId = String(formData.get("verdictId"));
  const label = String(formData.get("label"));
  const db = (await createAdminClient());
  const { data: v } = await db
    .from("verdicts")
    .update({ label, status: "confirmed", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", verdictId)
    .select("id, model_version, readings(lot_code, record)")
    .single();
  if (v && label !== "UNKNOWN") {
    const r = (v as any).readings;
    await issueCertificate(db, {
      verdictId: v.id, verdict: label as "GENUINE" | "DILUTED" | "SYNTHETIC",
      modelVersion: `${v.model_version ?? "?"}+expert`, record: r.record, lotCode: r.lot_code ?? null,
    });
  }
  revalidatePath("/expert");
}

// Add a sniff to the reference library the model compares against (no retraining needed).
export async function addToLibrary(formData: FormData) {
  const me = await requireRole("expert");
  await (await createAdminClient())
    .from("reference_library")
    .insert({ reading_id: String(formData.get("readingId")), class: String(formData.get("class")), added_by: me.id });
  revalidatePath("/expert");
}
