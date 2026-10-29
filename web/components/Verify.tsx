"use client";

// The public Verify page. Anyone (a police officer, a lawyer, a court) can drop a file here. Its
// fingerprint is taken in this browser and looked up; then the file is split back into the 5-second
// pieces it was sealed as, and every piece's Merkle proof and Polygon transaction is checked against
// the chain directly. Our server only says where to look; it is never trusted for the answer.
import { useCallback, useEffect, useState } from "react";
import { ANCHOR_ADDRESS, CHAIN_NAME, EXPLORER, findAnchor, SOURCE_URL, txUrl, type OnChainSeal } from "@/lib/chain";
import { leafOf, rootFromProof, sha256Of } from "@/lib/merkle";
import { shortHash } from "@/lib/recordings";

interface ApiPiece {
  seq: number;
  size: number;
  sha256: string;
  salt: string;
  capturedAt: string;
  seal: { root: string; proof: string[]; tx: string | null; block: number | null; anchoredAt: string | null } | null;
}
interface ApiResult {
  match: "file" | "piece" | null;
  file?: { size: number; pieceCount: number };
  pieces: ApiPiece[];
}

type Outcome =
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "changed" }
  | { kind: "error" }
  | {
      kind: "sealed" | "partial";
      pieces: number;
      sealedPieces: number;
      recordedAt: Date;
      sealedBy: Date | null;
      maxDelayS: number | null;
      txs: { hash: string; block: number; at: Date }[];
    };

interface Check {
  id: string;
  name: string | null; // null when opened from a QR code, with no file
  hash: string;
  outcome: Outcome;
}

const IST: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Kolkata" };
const when = (d: Date) => `${d.toLocaleString("en-IN", IST)} IST`;

async function verify(hash: string, bytes: ArrayBuffer | null): Promise<Outcome> {
  const res = await fetch(`/api/verify?h=${hash}`);
  if (!res.ok) return { kind: "error" };
  const body = (await res.json()) as ApiResult;
  if (!body.match || !body.pieces.length) return { kind: "none" };

  // A whole recording: it must split back, byte for byte, into the pieces that were sealed.
  if (bytes && body.match === "file") {
    if (body.pieces.reduce((n, p) => n + p.size, 0) !== bytes.byteLength) return { kind: "changed" };
    let offset = 0;
    for (const p of body.pieces) {
      if ((await sha256Of(bytes.slice(offset, offset + p.size))) !== p.sha256) return { kind: "changed" };
      offset += p.size;
    }
  }

  const chain = new Map<string, Promise<OnChainSeal | null>>();
  const txs = new Map<string, { hash: string; block: number; at: Date }>();
  const delays: number[] = [];
  let sealedPieces = 0;
  for (const p of body.pieces) {
    if (!p.seal?.tx) continue;
    const root = await rootFromProof(await leafOf(p.salt, p.sha256), p.seal.proof);
    if (root !== p.seal.root) return { kind: "changed" };
    const key = `${p.seal.tx}:${root}`;
    if (!chain.has(key)) chain.set(key, findAnchor(p.seal.tx, root));
    const onChain = await chain.get(key)!;
    if (!onChain) continue; // not mined yet
    sealedPieces++;
    txs.set(p.seal.tx, { hash: p.seal.tx, block: onChain.blockNumber, at: onChain.timestamp });
    delays.push((onChain.timestamp.getTime() - Date.parse(p.capturedAt)) / 1000);
  }
  const sealedTimes = [...txs.values()].map((t) => t.at.getTime());
  return {
    kind: sealedPieces === body.pieces.length ? "sealed" : "partial",
    pieces: body.pieces.length,
    sealedPieces,
    recordedAt: new Date(body.pieces[0].capturedAt),
    sealedBy: sealedTimes.length ? new Date(Math.max(...sealedTimes)) : null,
    maxDelayS: delays.length ? Math.max(0, Math.round(Math.max(...delays))) : null,
    txs: [...txs.values()].sort((a, b) => a.block - b.block),
  };
}

export function Verify() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [over, setOver] = useState(false);

  const run = useCallback(async (name: string | null, hash: string, bytes: ArrayBuffer | null) => {
    const id = crypto.randomUUID();
    setChecks((c) => [{ id, name, hash, outcome: { kind: "checking" } }, ...c]);
    const outcome = await verify(hash, bytes).catch((): Outcome => ({ kind: "error" }));
    setChecks((c) => c.map((x) => (x.id === id ? { ...x, outcome } : x)));
  }, []);

  const addFiles = useCallback(
    async (files: FileList | null) => {
      for (const file of Array.from(files ?? [])) {
        const bytes = await file.arrayBuffer();
        void run(file.name, await sha256Of(bytes), bytes);
      }
    },
    [run],
  );

  // Opened from the QR code on her phone: show that fingerprint's seal record straight away.
  useEffect(() => {
    const h = new URLSearchParams(location.search).get("h")?.toLowerCase();
    if (!h || !/^[0-9a-f]{64}$/.test(h)) return;
    const id = window.setTimeout(() => void run(null, h, null));
    return () => window.clearTimeout(id);
  }, [run]);

  return (
    <main className="min-h-dvh bg-white text-ink">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 pb-16 pt-10 md:grid-cols-[400px_1fr] md:gap-16 md:px-[60px] md:pt-[46px]">
        <section>
          <img src="/brand/wordmark-on-light.svg" alt="Saakshi" className="h-[26px]" />
          <h1 className="mt-[30px] font-display text-[44px] leading-none md:text-[60px]">Verify a file</h1>
          <p className="mt-4 text-[16px] leading-[1.55] text-muted">
            Drop a recording, photo or journal entry from Saakshi. Its fingerprint is calculated in your browser and checked
            against its seal on Polygon. The file itself never leaves your device.
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={`mt-7 flex h-[156px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed text-[14px] text-muted transition-colors ${over ? "border-rani bg-alert-bg" : "border-rani/45 bg-[#fdf5f8]"}`}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" className="fill-none stroke-rani [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
              <path d="M13 17V5M8 10l5-5 5 5M5 17v4h16v-4" />
            </svg>
            <span>
              <b className="font-medium text-rani">Choose a file</b> or drop it here
            </span>
            <input type="file" multiple className="sr-only" onChange={(e) => void addFiles(e.target.files)} />
          </label>
        </section>

        <section className="md:pt-1">
          <p className="label">Results</p>
          {checks.length === 0 ? (
            <p className="mt-4 border-t border-hairline pt-4 text-[15px] leading-relaxed text-muted">
              Nothing checked yet. Results appear here, newest first.
            </p>
          ) : (
            checks.map((c) => <Result key={c.id} check={c} />)
          )}
          <p className="mt-[26px] text-[14px] italic text-muted">
            A seal proves a file is unchanged since it was captured. It does not prove what the file shows.
          </p>
          <HowItWorks />
        </section>
      </div>
    </main>
  );
}

function Result({ check }: { check: Check }) {
  const { outcome: o } = check;
  const good = o.kind === "sealed";
  const bad = o.kind === "changed" || o.kind === "none";
  const title = check.name ?? `Fingerprint ${shortHash(check.hash)}`;
  return (
    <div className="mt-4 grid grid-cols-[48px_1fr] items-start gap-4 rounded-[20px] border border-hairline px-5 py-5 md:grid-cols-[56px_1fr_auto] md:items-center md:gap-[18px] md:px-6">
      {good ? (
        <img src="/brand/seal-pink.svg" alt="Saakshi seal" className="size-12 md:size-14" />
      ) : (
        <span className={`flex size-12 items-center justify-center rounded-full md:size-14 ${bad ? "bg-alert-bg" : "bg-blush"}`}>
          {bad ? (
            <svg width="20" height="20" viewBox="0 0 20 20" className="fill-none stroke-rani [stroke-linecap:round] [stroke-width:2]">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          ) : (
            <i className="size-2.5 animate-pulse rounded-full bg-rani" />
          )}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[17px] font-medium leading-snug [overflow-wrap:anywhere]">{title}</p>
        {check.name && <p className="mt-1 font-mono text-[13px] text-muted">{shortHash(check.hash)}</p>}
        <div className="mt-2 text-[13px] leading-relaxed text-muted">
          <Meta o={o} />
        </div>
      </div>
      <span
        className={`col-start-2 inline-flex h-8 w-fit items-center gap-2 rounded-full px-3.5 text-[14px] font-medium md:col-start-3 ${good ? "bg-verified-bg text-verified" : bad ? "bg-alert-bg text-rani" : "bg-blush text-muted"}`}
      >
        {good && (
          <svg width="14" height="14" viewBox="0 0 14 14" className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
            <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
          </svg>
        )}
        {{ checking: "Checking", none: "No seal found", changed: "Changed", error: "Try again", sealed: "Untampered", partial: "Sealing" }[o.kind]}
      </span>
    </div>
  );
}

function Meta({ o }: { o: Outcome }) {
  switch (o.kind) {
    case "checking":
      return <>Checking the fingerprint and its seal on {CHAIN_NAME}…</>;
    case "none":
      return <>This file does not match any sealed fingerprint. If it is a copy of a file from Saakshi, it has been changed.</>;
    case "changed":
      return <>This file does not match the pieces that were sealed. It has been changed since it was captured.</>;
    case "error":
      return <>Couldn’t reach the seal records. Check your connection and try again.</>;
    default:
      return (
        <>
          Captured {when(o.recordedAt)} by the phone’s clock.{" "}
          {o.kind === "sealed" ? (
            <>
              {o.pieces === 1 ? "Sealed" : <>All {o.pieces} pieces sealed</>} on {CHAIN_NAME}
              {o.sealedBy && <> by {when(o.sealedBy)}</>}
              {o.maxDelayS !== null && <>, {o.pieces === 1 ? "" : "each "}within {o.maxDelayS} s of capture</>}.
            </>
          ) : (
            <>
              {o.sealedPieces} of {o.pieces} pieces sealed so far; the rest are on their way.
            </>
          )}
          {o.txs.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-x-3">
              {o.txs.map((t) => (
                <a key={t.hash} href={txUrl(t.hash)} target="_blank" rel="noreferrer" className="text-rani underline underline-offset-2">
                  Block {t.block}
                </a>
              ))}
            </span>
          )}
        </>
      );
  }
}

function HowItWorks() {
  return (
    <details className="mt-8 border-t border-hairline pt-5 text-[14px] leading-relaxed text-muted">
      <summary className="cursor-pointer font-medium text-ink">How this check works</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          While she recorded, her phone took a SHA-256 fingerprint of every 5-second piece before encrypting it. A photo or journal
          entry is fingerprinted whole, the moment she adds it.
        </li>
        <li>
          Each fingerprint was salted and gathered into a Merkle tree, and the tree’s root was written to the{" "}
          <a href={`${EXPLORER}/address/${ANCHOR_ADDRESS}`} target="_blank" rel="noreferrer" className="text-rani underline underline-offset-2">
            EvidenceAnchor contract
          </a>{" "}
          on {CHAIN_NAME}, Polygon’s public test network. Its source code is{" "}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-rani underline underline-offset-2">
            public and verified
          </a>
          .
        </li>
        <li>This page splits your file back into those pieces, re-hashes each one, and checks its proof against the root.</li>
        <li>It then reads the transaction from the blockchain itself, so the answer doesn’t depend on trusting Saakshi’s servers.</li>
      </ol>
    </details>
  );
}
