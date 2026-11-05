"use server";
import { revalidatePath } from "next/cache";
import { requireRole, shortId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// The expert decides what an UNKNOWN sniff really was. Anything but UNKNOWN gets a certificate.
export async function reviewVerdict(formData: FormData) {
  const me = await requireRole("expert");
  const verdictId = String(formData.get("verdictId"));
  const label = String(formData.get("label"));
  const db = createAdminClient();
  const { data: v } = await db
    .from("verdicts")
    .update({ label, status: "confirmed", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", verdictId)
    .select("id, readings(lot_code)")
    .single();
  if (v && label !== "UNKNOWN") {
    await db.from("certificates").insert({ id: shortId(), verdict_id: v.id, lot_code: (v as any).readings?.lot_code ?? null });
  }
  revalidatePath("/expert");
}

// Add a sniff to the reference library the model compares against (no retraining needed).
export async function addToLibrary(formData: FormData) {
  const me = await requireRole("expert");
  await createAdminClient()
    .from("reference_library")
    .insert({ reading_id: String(formData.get("readingId")), class: String(formData.get("class")), added_by: me.id });
  revalidatePath("/expert");
}
