"use client";

// One recording: decrypted and played back on her phone, with its fingerprints.
import fixWebmDuration from "fix-webm-duration";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { txUrl } from "@/lib/chain";
import { digits, t, type StringKey } from "@/lib/i18n";
import type { Language } from "@/lib/local";
import {
  decryptRecording,
  deleteRecording,
  listPieces,
  recordingTitle,
  registerFile,
  shortHash,
  type Decrypted,
  type PieceInfo,
  type RecordingSummary,
} from "@/lib/recordings";
import { PIECE_MS } from "@/lib/capture";
import { BackIcon, Button, RoundButton, Screen, Wordmark } from "./ui";
import { LOCALE } from "./Vault";

export function Recording({
  lang,
  summary,
  privateKey,
  onBack,
}: {
  lang: Language;
  summary: RecordingSummary;
  privateKey: CryptoKey;
  onBack: () => void;
}) {
  const tr = (k: StringKey, v?: Record<string, string | number>) => t(lang, k, v);
  const { session } = summary;
  const [pieces, setPieces] = useState<PieceInfo[] | null>(null);
  const [plain, setPlain] = useState<Decrypted | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [part, setPart] = useState(0);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hashes, setHashes] = useState<string[]>([]); // each part's file fingerprint, as downloaded
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    const objectUrls: string[] = [];
    (async () => {
      try {
        const list = await listPieces(session.id);
        if (!live) return;
        setPieces(list);
        const d = await decryptRecording(session, list, privateKey);
        if (!live) return;
        setPlain(d);
        // Browsers write WebM without a duration, so the player can't seek. Patch a copy for
        // playback only; the evidence itself stays byte-for-byte as recorded.
        const segments = [...new Set(list.filter((p) => p.kind === "media").map((p) => p.segment))].sort((a, b) => a - b);
        for (const [i, blob] of d.media.entries()) {
          const times = list.filter((p) => p.kind === "media" && p.segment === segments[i]).map((p) => Date.parse(p.capturedAt));
          const ms = Math.max(1000, Math.max(...times) - Math.min(...times) + PIECE_MS);
          const playable = blob.type.includes("webm") ? await fixWebmDuration(blob, ms, { logger: false }) : blob;
          if (!live) return;
          objectUrls.push(URL.createObjectURL(playable));
        }
        setUrls([...objectUrls]);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [session, privateKey]);

  // Fingerprint each part as she would download it, and register it once all its pieces are uploaded.
  useEffect(() => {
    if (!plain || !pieces) return;
    let live = true;
    const segments = [...new Set(pieces.filter((p) => p.kind === "media").map((p) => p.segment))].sort((a, b) => a - b);
    Promise.all(plain.media.map((blob, i) => registerFile(session.id, segments[i], blob, pieces))).then(
      (h) => live && setHashes(h),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [plain, pieces, session.id]);

  const unsealed = !pieces || pieces.some((p) => !p.seal?.confirmed);
  useEffect(() => {
    if (!unsealed) return;
    const id = window.setInterval(() => listPieces(session.id).then(setPieces, () => {}), 8000);
    return () => window.clearInterval(id);
  }, [unsealed, session.id]);

  const media = pieces?.filter((p) => p.kind === "media") ?? [];
  const end = session.endedAt ?? pieces?.at(-1)?.capturedAt;
  const seconds = end ? Math.max(0, Math.round((Date.parse(end) - Date.parse(session.startedAt)) / 1000)) : 0;
  const lastFix = plain?.locations.at(-1);
  const isAudio = session.mime?.startsWith("audio/");

  const allSealed = pieces?.filter((p) => p.seal) ?? [];
  const sealFact =
    pieces && allSealed.length === pieces.length && pieces.length
      ? tr("sealDone")
      : allSealed.length
        ? tr("sealPartial", { n: digits(lang, allSealed.length), total: digits(lang, pieces?.length ?? 0) })
        : tr("sealPending");

  // The proof for the part on screen: its file is verifiable once every piece of it is on the server.
  const segmentIds = [...new Set(media.map((p) => p.segment))].sort((a, b) => a - b);
  const partPieces = media.filter((p) => p.segment === segmentIds[part]);
  const partUploaded = partPieces.length > 0 && partPieces.every((p) => !p.local);
  const partSealed = partUploaded && partPieces.every((p) => p.seal?.confirmed);
  const lastSeal = partSealed ? partPieces.map((p) => p.seal!).sort((a, b) => (a.at ?? "").localeCompare(b.at ?? "")).at(-1)! : null;
  const hash = hashes[part];
  const verifyUrl = hash && partUploaded ? `${process.env.NEXT_PUBLIC_VERIFY_ORIGIN ?? location.origin}/verify?h=${hash}` : null;

  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toString(verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1d1419", light: "#0000" } }).then(
      (svg) => setQr({ url: verifyUrl, svg }),
      () => {},
    );
  }, [verifyUrl]);

  function download() {
    if (!plain) return;
    const d = new Date(session.startedAt);
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    const ext = session.mime?.includes("mp4") ? "mp4" : "webm";
    // A plain name, so the file in her Downloads doesn't say what it is.
    const a = document.createElement("a");
    a.href = URL.createObjectURL(plain.media[part]);
    a.download = `recording-${stamp}${urls.length > 1 ? `-${part + 1}` : ""}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  async function share() {
    if (!verifyUrl) return;
    try {
      if (navigator.share) return await navigator.share({ url: verifyUrl });
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // She closed the share sheet.
    }
  }

  return (
    <Screen>
      <header className="flex h-14 items-center justify-between">
        <RoundButton label={tr("back")} onClick={onBack}>
          <BackIcon />
        </RoundButton>
        <Wordmark />
        <span className="size-11" />
      </header>

      <section className="mt-5" lang={lang}>
        <p className="label">
          {tr("evidence")} · {new Date(session.startedAt).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <h1 className="mt-1.5 font-display text-[36px] leading-[1.05]">{recordingTitle(session.startedAt, LOCALE[lang])}</h1>
      </section>

      <div className="mt-5 overflow-hidden rounded-sheet bg-plum">
        {urls.length ? (
          isAudio ? (
            <audio controls src={urls[part]} onEnded={() => setPart((n) => Math.min(n + 1, urls.length - 1))} className="w-full p-4" />
          ) : (
            <video
              controls
              playsInline
              autoPlay={part > 0}
              src={urls[part]}
              onEnded={() => setPart((n) => Math.min(n + 1, urls.length - 1))}
              className="aspect-[4/3] w-full bg-black object-contain"
            />
          )
        ) : (
          <p className="flex aspect-[4/3] items-center justify-center px-8 text-center text-body-sm text-on-dark-muted" lang={lang}>
            {failed ? tr("loadFailed") : media.length === 0 && pieces ? tr("locationOnly") : tr("decrypting")}
          </p>
        )}
      </div>

      {urls.length > 1 && (
        <div className="mt-3 flex gap-2" lang={lang}>
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setPart(i)}
              aria-pressed={part === i}
              className={`h-11 rounded-full border px-4 text-caption ${part === i ? "border-rani bg-rani text-white" : "border-hairline"}`}
            >
              {tr("part", { n: digits(lang, i + 1) })}
            </button>
          ))}
        </div>
      )}

      {summary.pending > 0 && <p className="mt-3 text-caption text-muted" lang={lang}>{tr("notUploaded")}</p>}

      {urls.length > 0 && (
        <section className="mt-5" lang={lang}>
          <div className="flex flex-col items-center rounded-sheet border border-hairline p-5">
            {qr && qr.url === verifyUrl ? (
              <div className="size-[164px] [&>svg]:size-full" role="img" aria-label="QR" dangerouslySetInnerHTML={{ __html: qr.svg }} />
            ) : (
              <div className="size-[164px] animate-pulse rounded-card bg-blush" />
            )}
            <p className="mt-3.5 max-w-[260px] text-center text-caption leading-[1.45] text-muted">{verifyUrl ? tr("qrNote") : tr("qrWaits")}</p>
          </div>
          <span
            className={`mt-4 inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium ${partSealed ? "bg-verified-bg text-verified" : "bg-blush text-muted"}`}
          >
            {partSealed ? (
              <svg width="14" height="14" viewBox="0 0 14 14" className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
              </svg>
            ) : (
              <i className="size-2 animate-pulse rounded-full bg-rani" />
            )}
            {partSealed ? tr("untampered") : `${tr("sealing")}…`}
          </span>
          <dl className="mt-2">
            {lastSeal?.at && (
              <Fact k={tr("sealedAt")} v={new Date(lastSeal.at).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" })} />
            )}
            {hash && <Fact k={tr("fileFingerprint")} v={shortHash(hash)} mono />}
            {lastSeal?.tx && (
              <Fact
                k={tr("anchoredOn")}
                v={
                  <a className="text-rani underline underline-offset-2" href={txUrl(lastSeal.tx)} target="_blank" rel="noreferrer">
                    Polygon
                  </a>
                }
              />
            )}
          </dl>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button onClick={download}>{tr("downloadOriginal")}</Button>
            <Button variant="ghost" onClick={share} disabled={!verifyUrl}>
              {copied ? tr("linkCopied") : tr("shareVerify")}
            </Button>
          </div>
        </section>
      )}

      <dl className="mt-4" lang={lang}>
        <Fact k={tr("started")} v={new Date(session.startedAt).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" })} />
        <Fact k={tr("length")} v={`${digits(lang, Math.floor(seconds / 60))}:${digits(lang, String(seconds % 60).padStart(2, "0"))}`} />
        <Fact k={tr("piecesLabel")} v={digits(lang, pieces?.length ?? summary.pieces)} />
        {lastFix && (
          <Fact
            k={tr("lastLocation")}
            v={
              <a
                className="text-rani underline underline-offset-2"
                href={`https://www.openstreetmap.org/?mlat=${lastFix.lat}&mlon=${lastFix.lng}#map=17/${lastFix.lat}/${lastFix.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                {lastFix.lat.toFixed(4)}, {lastFix.lng.toFixed(4)}
              </a>
            }
          />
        )}
        <Fact k={tr("seal")} v={sealFact} />
      </dl>

      <div className="mt-auto pt-8" lang={lang}>
        {confirming ? (
          <div className="rounded-card border border-hairline p-4">
            <p className="text-body-sm">{tr("deleteConfirm")}</p>
            <div className="mt-4 flex gap-2.5">
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {tr("cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteRecording(session.id);
                  onBack();
                }}
              >
                {tr("delete")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            {tr("deleteRecording")}
          </Button>
        )}
      </div>
    </Screen>
  );
}

function Fact({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-[11px] text-body-sm">
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right ${mono ? "font-mono text-caption" : ""}`}>{v}</dd>
    </div>
  );
}
