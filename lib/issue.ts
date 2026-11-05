import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortId } from "./auth";
import { makeCertificate } from "./chain/certificate";
import type { DeviceRecord } from "./record";

/** Issue a certificate for a verdict: a W3C-style credential body that later goes into a Merkle batch. */
export async function issueCertificate(
  db: SupabaseClient,
  a: { verdictId: string; verdict: "GENUINE" | "DILUTED" | "SYNTHETIC"; modelVersion: string; record: DeviceRecord; lotCode: string | null },
) {
  const id = shortId();
  let product = "Unregistered sample";
  if (a.lotCode) {
    const { data: lot } = await db.from("lots").select("product").eq("code", a.lotCode).single();
    if (lot) product = lot.product;
  }
  const body = makeCertificate({
    certId: id, lotId: a.lotCode ?? "NO-LOT", product, verdict: a.verdict, modelVersion: a.modelVersion, record: a.record,
  });
  const { error } = await db.from("certificates").insert({ id, verdict_id: a.verdictId, lot_code: a.lotCode, body });
  if (error) throw new Error(error.message);
  return id;
}
