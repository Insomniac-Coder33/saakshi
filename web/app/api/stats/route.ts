// Live numbers for the showcase site: seals confirmed on Polygon and the pieces they cover.
// Roots and transactions are public on-chain anyway; nothing here identifies anyone.
import { adminClient } from "@/lib/admin";

const DAYS = 14;

export async function GET() {
  const db = adminClient();
  // Pieces are counted from the seals themselves: an erased account's pieces are gone from our tables,
  // but their seals stand on-chain. A select returns at most 1,000 rows, so read them page by page.
  const PAGE = 1000;
  let seals = 0;
  let piecesSealed = 0;
  let latest: { tx_hash: string | null; block_number: number | null; anchored_at: string | null } | undefined;
  // The showcase's activity grid: pieces sealed in each hour of the last 14 days, by Indian time, oldest first.
  const IST_MS = 330 * 60_000;
  const today = Math.floor((Date.now() + IST_MS) / 86_400_000);
  const first = (today - (DAYS - 1)) * 86_400_000 - IST_MS;
  const hours = new Array<number>(DAYS * 24).fill(0);
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("seals")
      .select("leaf_count, tx_hash, block_number, anchored_at")
      .eq("status", "confirmed")
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return Response.json({ error: "unavailable" }, { status: 503 });
    latest ??= data[0];
    seals += data.length;
    piecesSealed += data.reduce((n, s) => n + s.leaf_count, 0);
    for (const s of data) {
      const at = s.anchored_at ? Date.parse(s.anchored_at) : NaN;
      const slot = Math.floor((at - first) / 3_600_000);
      if (slot >= 0 && slot < hours.length) hours[slot] += s.leaf_count;
    }
    if (data.length < PAGE) break;
  }
  // How long a piece waits between reaching us and its block: the median over recent sealed pieces.
  const { data: waits } = await db
    .from("pieces")
    .select("received_at, seals!inner(anchored_at, status)")
    .eq("seals.status", "confirmed")
    .order("id", { ascending: false })
    .limit(500);
  const secs = (waits ?? [])
    .map((p) => {
      const seal = (Array.isArray(p.seals) ? p.seals[0] : p.seals) as { anchored_at: string | null } | null;
      return seal?.anchored_at ? (Date.parse(seal.anchored_at) - Date.parse(p.received_at)) / 1000 : NaN;
    })
    .filter((s) => s >= 0)
    .sort((a, b) => a - b);
  return Response.json(
    {
      seals,
      piecesSealed,
      medianSealSeconds: secs.length ? Math.round(secs[Math.floor(secs.length / 2)]) : null,
      latest: latest ? { tx: latest.tx_hash, block: latest.block_number, at: latest.anchored_at } : null,
      activity: { from: new Date(first).toISOString(), hours },
    },
    { headers: { "cache-control": "public, max-age=30" } },
  );
}
