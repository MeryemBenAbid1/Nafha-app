import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Role = "technician" | "expert" | "brand" | "admin";

export const HOME: Record<Role, string> = {
  technician: "/technician",
  expert: "/expert",
  brand: "/brand",
  admin: "/technician",
};

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, email, role").eq("id", user.id).single();
  return data as { id: string; email: string; role: Role } | null;
}

// Use at the top of a page or server action. Admin can open every screen.
export async function requireRole(...roles: Role[]) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin" && !roles.includes(profile.role)) redirect(HOME[profile.role]);
  return profile;
}

export function shortId(n = 10) {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
