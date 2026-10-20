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

  const media = pieces?.filter((p) => p.kind === "media") ?? [];
  const first = media[0] ?? pieces?.[0];
  const end = session.endedAt ?? pieces?.at(-1)?.capturedAt;
  const seconds = end ? Math.max(0, Math.round((Date.parse(end) - Date.parse(session.startedAt)) / 1000)) : 0;
  const lastFix = plain?.locations.at(-1);
  const isAudio = session.mime?.startsWith("audio/");

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

      <dl className="mt-4" lang={lang}>
        <Fact k={tr("started")} v={new Date(session.startedAt).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" })} />
        <Fact k={tr("length")} v={`${digits(lang, Math.floor(seconds / 60))}:${digits(lang, String(seconds % 60).padStart(2, "0"))}`} />
        <Fact k={tr("piecesLabel")} v={digits(lang, pieces?.length ?? summary.pieces)} />
        {first && <Fact k={`${tr("fingerprint")} (${tr("firstPiece")})`} v={shortHash(first.sha256)} mono />}
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
        <Fact k={tr("seal")} v={tr("sealPending")} />
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
