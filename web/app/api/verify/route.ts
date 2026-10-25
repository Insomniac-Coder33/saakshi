// Public lookup for the Verify page: given a file's SHA-256, returns the sealed pieces it is made of,
// with each piece's salt, Merkle proof and anchoring transaction. The page then re-hashes the file
// and checks every proof and transaction against the chain itself, so it doesn't have to trust us.
// Nothing here says who recorded it or where: no owner, no session, no location, no content.
import { adminClient } from "@/lib/admin";

interface PieceRow {
  seq: number;
  size: number;
  sha256: string;
  salt: string;
  proof: string[] | null;
  captured_at: string;
  received_at: string;
  seals: { root: string; status: string; tx_hash: string | null; block_number: number | null; anchored_at: string | null } | null;
}

const PIECE_FIELDS = "seq, size, sha256, salt, proof, captured_at, received_at, seals(root, status, tx_hash, block_number, anchored_at)";

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("h")?.toLowerCase() ?? "";
  if (!/^[0-9a-f]{64}$/.test(hash)) return Response.json({ error: "h must be a SHA-256 in hex" }, { status: 400 });
  const db = adminClient();

  const { data: file } = await db
    .from("files")
    .select("session_id, segment, size, piece_count, created_at")
    .eq("sha256", hash)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (file) {
    const { data: pieces } = await db
      .from("pieces")
      .select(PIECE_FIELDS)
      .eq("session_id", file.session_id)
      .eq("segment", file.segment)
      .eq("kind", "media")
      .order("seq")
      .returns<PieceRow[]>();
    return Response.json({
      match: "file",
      file: { size: file.size, pieceCount: file.piece_count, registeredAt: file.created_at },
      pieces: (pieces ?? []).map(shape),
    });
  }

  const { data: piece } = await db.from("pieces").select(PIECE_FIELDS).eq("sha256", hash).limit(1).returns<PieceRow[]>().maybeSingle();
  if (piece) return Response.json({ match: "piece", pieces: [shape(piece)] });
  return Response.json({ match: null, pieces: [] });
}

function shape(p: PieceRow) {
  const sealed = p.seals?.status === "confirmed" || p.seals?.status === "sent";
  return {
    seq: p.seq,
    size: p.size,
    sha256: p.sha256,
    salt: p.salt,
    capturedAt: p.captured_at,
    receivedAt: p.received_at,
    seal: sealed && p.proof
      ? { root: p.seals!.root, proof: p.proof, tx: p.seals!.tx_hash, block: p.seals!.block_number, anchoredAt: p.seals!.anchored_at }
      : null,
  };
}
