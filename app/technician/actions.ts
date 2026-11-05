"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setActiveLot(formData: FormData) {
  await requireRole("technician");
  const deviceId = String(formData.get("deviceId"));
  const lot = String(formData.get("lotCode") || "") || null;
  await createAdminClient().from("devices").update({ active_lot_code: lot }).eq("id", deviceId);
  revalidatePath("/technician");
}
