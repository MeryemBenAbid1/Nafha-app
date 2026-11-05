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
