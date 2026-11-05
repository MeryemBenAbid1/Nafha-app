// GET /t?picc_data=…&cmac=… — the URL an NTAG 424 DNA seal produces on every tap.
// Program the tags (NXP TagXplorer/TagWriter) with SDM mirroring to: <APP_URL>/t?picc_data=00…&cmac=00…
// Demo keys come from SUN_K_META and SUN_K_FILE (16-byte hex). Real tags need their own keys.
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySun } from "@/lib/sun";

function fail(req: Request, reason: string) {
  return NextResponse.redirect(new URL(`/seal?reason=${encodeURIComponent(reason)}`, req.url));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const picc_data = q.get("picc_data") ?? "";
  const cmac = q.get("cmac") ?? "";
  if (!/^[0-9a-fA-F]{32}$/.test(picc_data) || !/^[0-9a-fA-F]{16}$/.test(cmac)) return fail(req, "This link isn't from a Nafha seal.");
  const kMeta = process.env.SUN_K_META, kFile = process.env.SUN_K_FILE;
  if (!kMeta || !kFile) return fail(req, "Seal checking isn't set up on this server yet.");

  let result;
  try {
    result = verifySun({ picc_data, cmac }, { kMeta: Buffer.from(kMeta, "hex"), kFile: Buffer.from(kFile, "hex") });
  } catch {
    return fail(req, "The seal's data couldn't be read. It may be a copy.");
  }
  if (!result.macOk) return fail(req, "The seal's signature is wrong. This may be a fake seal.");

  const db = createAdminClient();
  const { data: tag } = await db.from("nfc_tags").select("uid, lot_code, last_counter").eq("uid", result.uid).maybeSingle();
  if (!tag) return fail(req, "This seal isn't registered to any Nafha product.");
  if (result.counter <= tag.last_counter) return fail(req, "This tap was already used. Someone may have copied the seal's link.");

  // Only move the counter forward if nobody else did in the meantime.
  const { data: moved } = await db
    .from("nfc_tags").update({ last_counter: result.counter }).eq("uid", tag.uid).lt("last_counter", result.counter).select().maybeSingle();
  if (!moved) return fail(req, "This tap was already used.");

  const tapId = randomBytes(12).toString("hex");
  await db.from("seal_taps").insert({ id: tapId, uid: tag.uid, counter: result.counter });

  const { data: cert } = await db
    .from("certificates").select("id").eq("lot_code", tag.lot_code).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!cert) return fail(req, "The seal is genuine, but this lot has no certificate yet.");
  return NextResponse.redirect(new URL(`/c/${cert.id}?tap=${tapId}`, req.url));
}
