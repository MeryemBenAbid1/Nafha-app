"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createLot(formData: FormData) {
  const me = await requireRole("brand");
  const code = String(formData.get("code")).trim().toUpperCase();
  if (!code) return;
  await createAdminClient().from("lots").insert({
    code,
    product: String(formData.get("product")),
    brand: String(formData.get("brand")),
    origin: String(formData.get("origin") || "") || null,
    created_by: me.id,
  });
  revalidatePath("/brand");
}

// Link an NFC seal to a lot. The UID is printed by NXP TagXplorer/TagWriter when you program the tag.
export async function linkSeal(formData: FormData) {
  await requireRole("brand");
  const uid = String(formData.get("uid")).replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (uid.length !== 14) return;
  await createAdminClient().from("nfc_tags").upsert({ uid, lot_code: String(formData.get("lotCode")) });
  revalidatePath("/brand");
}
