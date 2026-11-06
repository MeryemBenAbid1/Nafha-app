"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { anchorPending, registerDeviceOnChain } from "@/lib/chain/server";
import { BLENDS, fakeSniff, type Blend } from "@/lib/fake-device";
import { ingestRecord } from "@/lib/ingest";

export async function setActiveLot(formData: FormData) {
  await requireRole("technician");
  const deviceId = String(formData.get("deviceId"));
  const lot = String(formData.get("lotCode") || "") || null;
  await (await createAdminClient()).from("devices").update({ active_lot_code: lot }).eq("id", deviceId);
  revalidatePath("/technician");
}

export async function anchorNow() {
  await requireRole("technician");
  let msg: string;
  try {
    const r = await anchorPending();
    msg = r.anchored ? `Anchored ${r.anchored} certificates in tx ${r.tx}` : "Nothing waiting to be anchored.";
  } catch (e) {
    msg = `Anchoring failed: ${(e as Error).message}`;
  }
  redirect(`/technician?msg=${encodeURIComponent(msg)}`);
}

export async function registerDevice(formData: FormData) {
  await requireRole("admin");
  const deviceId = String(formData.get("deviceId"));
  const { data: d } = await (await createAdminClient()).from("devices").select("public_key").eq("id", deviceId).single();
  let msg: string;
  try {
    msg = `Device ${deviceId} registered on chain: ${await registerDeviceOnChain(deviceId, d!.public_key)}`;
  } catch (e) {
    msg = `Registering failed: ${(e as Error).message}`;
  }
  redirect(`/technician?msg=${encodeURIComponent(msg)}`);
}

// Demo button: the server's built-in fake device makes one signed sniff and sends it through the real pipeline.
export async function simulateSniff(formData: FormData) {
  await requireRole("technician");
  const pick = String(formData.get("blend"));
  const blend = (BLENDS as readonly string[]).includes(pick) ? (pick as Blend) : BLENDS[Math.floor(Math.random() * 4)];
  const record = await fakeSniff(await createAdminClient(), blend);
  const { status, body } = await ingestRecord(record);
  const msg = status === 200 ? `Fake ${blend} sniff → ${body.verdict}` : `Fake sniff rejected (${status}): ${body.error}`;
  redirect(`/technician?msg=${encodeURIComponent(msg)}`);
}
