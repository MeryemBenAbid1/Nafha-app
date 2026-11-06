"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["buyer", "seller", "perfume_house", "other"] as const;

export async function joinWaitlist(formData: FormData) {
  // Hidden field bots fill in; people never see it.
  if (String(formData.get("website") || "")) redirect("/join?done=1");

  const contact = String(formData.get("contact") || "").trim().slice(0, 120);
  const role = String(formData.get("role") || "");
  const source = String(formData.get("src") || "").trim().slice(0, 40) || null;
  if (!contact || !(ROLES as readonly string[]).includes(role)) {
    redirect(`/join?error=1${source ? `&src=${encodeURIComponent(source)}` : ""}`);
  }
  const { error } = await (await createAdminClient()).from("waitlist").insert({
    name: String(formData.get("name") || "").trim().slice(0, 80) || null,
    contact,
    role,
    source,
    note: String(formData.get("note") || "").trim().slice(0, 500) || null,
  });
  if (error) {
    console.error("waitlist insert failed", error.message);
    redirect(`/join?error=2${source ? `&src=${encodeURIComponent(source)}` : ""}`);
  }
  redirect("/join?done=1");
}
