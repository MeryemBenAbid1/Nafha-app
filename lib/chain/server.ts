import "server-only";
// Writes to the chain. Only the server holds the anchor key (ANCHOR_PRIVATE_KEY, a TEST wallet only).

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createAdminClient } from "../supabase/admin";
import { anchorAbi, chainConfig, chainReady, getChain, publicClient } from "./contract";
import { buildBatch, idToBytes32, pubToXY, type CertificateBody, type Hex } from "./certificate";

function wallet() {
  const pk = process.env.ANCHOR_PRIVATE_KEY;
  if (!chainReady() || !pk) throw new Error("Blockchain not set up: fill the chain lines in .env.local (see README).");
  const account = privateKeyToAccount((pk.startsWith("0x") ? pk : `0x${pk}`) as Hex);
  return createWalletClient({ account, chain: getChain(), transport: http(chainConfig.rpc || undefined) });
}

/** Put every not-yet-anchored certificate into one Merkle batch and anchor its root. */
export async function anchorPending() {
  const db = (await createAdminClient());
  const { data: certs } = await db.from("certificates").select("id, body").is("batch_id", null).not("body", "is", null).order("created_at");
  if (!certs?.length) return { anchored: 0 };

  const batch = buildBatch(certs.map((c) => c.body as CertificateBody));
  const label = `batch-${new Date().toISOString()}`;
  const batchId = idToBytes32(label);
  const w = wallet();
  const tx = await w.writeContract({
    address: chainConfig.address, abi: anchorAbi, functionName: "anchorRoot", args: [batchId, batch.root, batch.leafCount],
  });
  await publicClient().waitForTransactionReceipt({ hash: tx });

  await db.from("batches").insert({ id: batchId, label, root: batch.root, leaf_count: batch.leafCount, tx_hash: tx, chain_id: chainConfig.id });
  await Promise.all(
    certs.map((c, i) =>
      db.from("certificates").update({ batch_id: batchId, batch_root: batch.root, proof: batch.proofs[i], anchor_tx: tx }).eq("id", c.id),
    ),
  );
  return { anchored: certs.length, tx };
}

/** Put a device's public key on chain, so buyers check signatures against the chain, not our database. */
export async function registerDeviceOnChain(deviceId: string, publicKeyHex: string) {
  const { qx, qy } = pubToXY(publicKeyHex);
  const w = wallet();
  const tx = await w.writeContract({
    address: chainConfig.address, abi: anchorAbi, functionName: "registerDevice", args: [idToBytes32(deviceId), qx, qy],
  });
  await publicClient().waitForTransactionReceipt({ hash: tx });
  await (await createAdminClient()).from("devices").update({ chain_tx: tx }).eq("id", deviceId);
  return tx;
}
