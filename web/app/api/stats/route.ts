// Live numbers for the showcase site: seals confirmed on Polygon and the pieces they cover.
// Roots and transactions are public on-chain anyway; nothing here identifies anyone.
import { adminClient } from "@/lib/admin";

export async function GET() {
  const { data, error } = await adminClient()
    .from("seals")
    .select("leaf_count, tx_hash, block_number, anchored_at")
    .eq("status", "confirmed")
    .order("id", { ascending: false });
  if (error) return Response.json({ error: "unavailable" }, { status: 503 });
  const latest = data[0];
  return Response.json(
    {
      seals: data.length,
      piecesSealed: data.reduce((n, s) => n + s.leaf_count, 0),
      latest: latest ? { tx: latest.tx_hash, block: latest.block_number, at: latest.anchored_at } : null,
    },
    { headers: { "cache-control": "public, max-age=30" } },
  );
}
