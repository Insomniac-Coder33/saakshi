// Seals waiting pieces: one Merkle root per batch, anchored on Polygon Amoy by the relayer wallet,
// so she never needs a wallet or gas. Phones call this after uploading, and a once-a-minute database
// cron calls it too, so pieces from a phone that was taken still get sealed. Safe to call at any time:
// it seals at most once every SEAL_MIN_GAP_SECONDS and spends gas only when something is waiting.
import type { SupabaseClient } from "@supabase/supabase-js";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { adminClient } from "@/lib/admin";
import { watchSilentPhones } from "@/lib/alerts";
import { ANCHOR_ABI, ANCHOR_ADDRESS, CHAIN_ID, PUBLIC_RPCS } from "@/lib/chain";
import { buildTree, leafOf } from "@/lib/merkle";

export const maxDuration = 60;

const MIN_GAP_SECONDS = Number(process.env.SEAL_MIN_GAP_SECONDS ?? 30);
const MAX_LEAVES = 4096;
// A seal uses about 24k gas; the network wants gas limit × max fee in the wallet before it accepts one.
const SEAL_GAS = BigInt(30_000);
// Amoy rejects tips under 25 gwei, and ethers' default tip is 1 gwei.
const MIN_TIP = BigInt(30e9);
const ZERO = BigInt(0);

function provider() {
  return new JsonRpcProvider(process.env.AMOY_RPC_URL || PUBLIC_RPCS[0], CHAIN_ID, { staticNetwork: true });
}

export async function POST() {
  // The same once-a-minute cron also watches for an SOS whose phone has gone quiet.
  if (process.env.TELEGRAM_BOT_TOKEN) await watchSilentPhones(adminClient()).catch((e) => console.error("[alert] watch", e));
  if (!process.env.RELAYER_PRIVATE_KEY) return Response.json({ error: "sealer not configured" }, { status: 503 });
  const db = adminClient();
  const chain = provider();
  await recoverStuck(db, chain);

  // A relayer that can't pay for a seal would build one, fail and put it back every minute. Say why instead;
  // the pieces wait, safely stored, until it is topped up.
  const wallet = new Wallet(process.env.RELAYER_PRIVATE_KEY, chain);
  const [balance, fee] = await Promise.all([chain.getBalance(wallet.address), fees(chain)]).catch(() => [null, null] as const);
  if (balance !== null && fee !== null && balance < fee.maxFeePerGas * SEAL_GAS) {
    console.error(`[seal] relayer ${wallet.address} is low: ${balance} wei`);
    return Response.json({ error: "relayer low", retryAfter: 300 }, { status: 503 });
  }

  const { data: claimed, error: claimError } = await db.rpc("seal_claim", { min_gap_seconds: MIN_GAP_SECONDS });
  if (claimError) return Response.json({ error: "claim failed" }, { status: 500 });
  if (!claimed) return Response.json({ sealed: 0, retryAfter: MIN_GAP_SECONDS });

  let attempted = false;
  try {
    const { data: waiting, error } = await db
      .from("pieces")
      .select("id, salt, sha256, leaf")
      .is("seal_id", null)
      .not("leaf", "is", null)
      .order("received_at")
      .limit(MAX_LEAVES);
    if (error) throw error;
    // A seal covers only leaves that really are SHA-256(salt || fingerprint).
    const rows = [];
    for (const p of waiting ?? []) if ((await leafOf(p.salt, p.sha256)) === p.leaf) rows.push(p);
    if (!rows.length) return Response.json({ sealed: 0 });

    const tree = await buildTree(rows.map((r) => r.leaf));
    const { data: sealId, error: recordError } = await db.rpc("seal_record", {
      p_root: tree.root,
      p_items: rows.map((r, i) => ({ id: r.id, proof: tree.proofs[i] })),
    });
    if (recordError) throw recordError;
    attempted = true; // from here on, space out the next try even if this one fails

    const anchor = new Contract(ANCHOR_ADDRESS, ANCHOR_ABI, wallet);
    let txHash: string;
    try {
      const tx = await anchor.anchor(`0x${tree.root}`, rows.length, await fees(chain));
      txHash = tx.hash;
    } catch (e) {
      await release(db, sealId);
      throw e;
    }
    await db.from("seals").update({ status: "sent", tx_hash: txHash }).eq("id", sealId);
    // If confirmation is slow, the seal stays "sent" and recoverStuck() confirms it on a later call.
    const receipt = await chain.waitForTransaction(txHash, 1, 40_000).catch(() => null);
    if (receipt) await settle(db, chain, sealId, receipt.status === 1, receipt.blockNumber);
    return Response.json({ sealed: rows.length, root: tree.root, tx: txHash, confirmed: receipt?.status === 1 });
  } catch (e) {
    console.error("[seal]", e instanceof Error ? e.message : e);
    return Response.json({ error: "seal failed" }, { status: 500 });
  } finally {
    await db.rpc("seal_release", { sealed: attempted });
  }
}

async function fees(chain: JsonRpcProvider) {
  const [suggested, block] = await Promise.all([
    chain.send("eth_maxPriorityFeePerGas", []).then(BigInt, () => ZERO),
    chain.getBlock("latest"),
  ]);
  const tip = suggested > MIN_TIP ? suggested : MIN_TIP;
  return { maxPriorityFeePerGas: tip, maxFeePerGas: (block?.baseFeePerGas ?? ZERO) * BigInt(2) + tip };
}

/** Marks a sent seal confirmed (with the block's own time) or failed. */
async function settle(db: SupabaseClient, chain: JsonRpcProvider, sealId: number, ok: boolean, blockNumber: number) {
  if (!ok) return release(db, sealId);
  const block = await chain.getBlock(blockNumber);
  await db
    .from("seals")
    .update({
      status: "confirmed",
      block_number: blockNumber,
      anchored_at: block ? new Date(block.timestamp * 1000).toISOString() : null,
    })
    .eq("id", sealId);
}

/**
 * A seal that never made it on-chain: its pieces go back in the queue, and the row goes, because
 * the same leaves will build the same root next time.
 */
async function release(db: SupabaseClient, sealId: number) {
  await db.from("pieces").update({ seal_id: null, proof: null }).eq("seal_id", sealId);
  await db.from("seals").delete().eq("id", sealId);
}

/** Finishes seals left open by a run that timed out or crashed. */
async function recoverStuck(db: SupabaseClient, chain: JsonRpcProvider) {
  const { data: open } = await db
    .from("seals")
    .select("id, status, tx_hash, created_at")
    .in("status", ["building", "sent"])
    .lt("created_at", new Date(Date.now() - 2 * 60_000).toISOString());
  for (const s of open ?? []) {
    if (!s.tx_hash) {
      await release(db, s.id);
      continue;
    }
    const receipt = await chain.getTransactionReceipt(s.tx_hash).catch(() => null);
    if (receipt) await settle(db, chain, s.id, receipt.status === 1, receipt.blockNumber);
    else if (Date.parse(s.created_at) < Date.now() - 10 * 60_000) await release(db, s.id);
  }
}
