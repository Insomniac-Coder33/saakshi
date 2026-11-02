"use client";

// One recording: decrypted and played back on her phone, with its fingerprints.
import fixWebmDuration from "fix-webm-duration";
import { useEffect, useState } from "react";
import { digits, t, type StringKey } from "@/lib/i18n";
import type { Language } from "@/lib/local";
import {
  decryptRecording,
  deleteRecording,
  listPieces,
  recordingTitle,
  registerFile,
  type Decrypted,
  type PieceInfo,
  type RecordingSummary,
} from "@/lib/recordings";
import { PIECE_MS } from "@/lib/capture";
import { verifyUrlFor } from "@/lib/site";
import { Certificate, type CertItem } from "./Certificate";
import { downloadBlob, Fact, fileStamp, ProofPanel } from "./Proof";
import { BackIcon, Button, RoundButton, Screen, Wordmark } from "./ui";
import { LOCALE } from "./Vault";

export function Recording({
  lang,
  userId,
  summary,
  privateKey,
  onBack,
}: {
  lang: Language;
  userId: string;
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
  const [certificate, setCertificate] = useState(false);

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
  const verifyUrl = hash && partUploaded ? verifyUrlFor(hash) : null;

  const ext = session.mime?.includes("mp4") ? "mp4" : "webm";
  const fileName = (i: number) => `recording-${fileStamp(session.startedAt)}${urls.length > 1 ? `-${i + 1}` : ""}.${ext}`;

  function download() {
    if (plain) downloadBlob(plain.media[part], fileName(part));
  }

  if (certificate && plain) {
    // One entry per part whose pieces are all on the server, so each has a verify link.
    const items: CertItem[] = segmentIds.flatMap((seg, i) => {
      const ps = media.filter((p) => p.segment === seg);
      if (!hashes[i] || !ps.length || ps.some((p) => p.local)) return [];
      return [
        {
          label: segmentIds.length > 1 ? `Recording, part ${i + 1}` : "Recording",
          fileName: fileName(i),
          sha256: hashes[i],
          bytes: plain.media[i].size,
          pieces: ps,
          verifyUrl: verifyUrlFor(hashes[i]),
        },
      ];
    });
    return <Certificate lang={lang} userId={userId} items={items} onBack={() => setCertificate(false)} />;
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
        <div className="mt-3 flex flex-wrap gap-2" lang={lang}>
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
        <ProofPanel
          lang={lang}
          verifyUrl={verifyUrl}
          sealed={partSealed}
          lastSeal={lastSeal}
          hash={hash}
          qrNote="qrNote"
          onDownload={download}
          onCertificate={() => setCertificate(true)}
        />
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
