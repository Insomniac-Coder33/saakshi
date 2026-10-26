"use client";

// Journal entries and photos in her vault: writing and adding them, the lists, and one item opened
// with its proof. Every item is sealed the same way as a recording.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addJournal,
  addPhoto,
  journalPreview,
  listEvidence,
  MAX_PHOTO_BYTES,
  openEvidence,
  type EvidenceKind,
  type EvidenceSummary,
  type OpenedEvidence,
} from "@/lib/evidence";
import { t, type StringKey } from "@/lib/i18n";
import type { DeviceSetup, Language, LocalSession } from "@/lib/local";
import { deleteRecording, listPieces, recordingTitle, type PieceInfo } from "@/lib/recordings";
import { verifyUrlFor } from "@/lib/site";
import { onSynced } from "@/lib/sync";
import { Certificate } from "./Certificate";
import { downloadBlob, Fact, fileStamp, ProofPanel } from "./Proof";
import { BackIcon, Button, RoundButton, Screen, Wordmark } from "./ui";
import { LOCALE } from "./Vault";

type Tr = (k: StringKey, v?: Record<string, string | number>) => string;

function useEvidence(kind: EvidenceKind) {
  const [items, setItems] = useState<EvidenceSummary[] | null>(null);
  const refresh = useCallback(() => {
    listEvidence(kind).then(setItems, () => setItems([]));
  }, [kind]);
  useEffect(() => {
    refresh();
    return onSynced(refresh);
  }, [refresh]);
  return items;
}

function Status({ item, tr }: { item: EvidenceSummary; tr: Tr }) {
  return <>{item.pending ? tr("uploading", { n: 1 }) : item.sealed ? tr("allSealed") : `${tr("sealing")}…`}</>;
}

/** Her journal: a button to write, and each entry with the start of what she wrote. */
export function JournalList({ lang, privateKey, onWrite, onOpen }: { lang: Language; privateKey: CryptoKey; onWrite: () => void; onOpen: (s: LocalSession) => void }) {
  const tr: Tr = (k, v) => t(lang, k, v);
  const items = useEvidence("journal");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const asked = useRef(new Set<string>());

  useEffect(() => {
    for (const item of items ?? []) {
      if (asked.current.has(item.session.id)) continue;
      asked.current.add(item.session.id);
      openEvidence(item.session, privateKey).then(
        (o) => setPreviews((p) => ({ ...p, [item.session.id]: journalPreview(o.text ?? "") })),
        () => asked.current.delete(item.session.id),
      );
    }
  }, [items, privateKey]);

  return (
    <>
      <Button variant="ghost" onClick={onWrite}>
        {tr("journalWrite")}
      </Button>
      <p className="mt-3 text-center text-caption text-muted">{tr("journalTip")}</p>
      {items === null ? (
        <div className="mt-4 h-20 animate-pulse rounded-card bg-blush" />
      ) : items.length === 0 ? (
        <p className="mt-4 border-t border-hairline pt-4 text-body-sm leading-relaxed text-muted">{tr("journalEmpty")}</p>
      ) : (
        <ul className="mt-4">
          {items.map((item) => (
            <li key={item.session.id}>
              <button type="button" onClick={() => onOpen(item.session)} className="flex w-full items-center gap-4 border-b border-hairline py-4 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-h3 leading-tight">{recordingTitle(item.session.startedAt, LOCALE[lang])}</span>
                  <span className="mt-1 line-clamp-2 text-body-sm leading-snug text-ink/80">{previews[item.session.id] ?? "…"}</span>
                  <span className="mt-1 block text-caption text-muted">
                    <Status item={item} tr={tr} />
                  </span>
                </span>
                <Chevron />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Her photos and screenshots, as a grid of thumbnails decrypted on the phone. */
export function PhotoGrid({ lang, privateKey, onAdd, onOpen }: { lang: Language; privateKey: CryptoKey; onAdd: (f: File) => void; onOpen: (s: LocalSession) => void }) {
  const tr: Tr = (k, v) => t(lang, k, v);
  const items = useEvidence("vault");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [tooBig, setTooBig] = useState(false);
  const asked = useRef(new Map<string, string | null>()); // session id → its object URL, once decrypted

  useEffect(() => {
    for (const item of items ?? []) {
      if (asked.current.has(item.session.id)) continue;
      asked.current.set(item.session.id, null);
      openEvidence(item.session, privateKey).then(
        (o) => {
          const u = URL.createObjectURL(o.file);
          asked.current.set(item.session.id, u);
          setThumbs((p) => ({ ...p, [item.session.id]: u }));
        },
        () => asked.current.delete(item.session.id),
      );
    }
  }, [items, privateKey]);

  useEffect(() => {
    const urls = asked.current;
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, []);

  return (
    <>
      <label className="flex h-14 w-full cursor-pointer items-center justify-center rounded-full border border-[#e4cbd6] bg-white text-[16px] font-medium active:bg-blush">
        {tr("photoAdd")}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setTooBig(f.size > MAX_PHOTO_BYTES);
            if (f.size <= MAX_PHOTO_BYTES) onAdd(f);
          }}
        />
      </label>
      <p className={`mt-3 text-center text-caption ${tooBig ? "text-rani" : "text-muted"}`}>{tr(tooBig ? "photoTooBig" : "photoTip")}</p>
      {items === null ? (
        <div className="mt-4 h-20 animate-pulse rounded-card bg-blush" />
      ) : items.length === 0 ? (
        <p className="mt-4 border-t border-hairline pt-4 text-body-sm leading-relaxed text-muted">{tr("photoEmpty")}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-1.5">
          {items.map((item) => (
            <li key={item.session.id}>
              <button
                type="button"
                onClick={() => onOpen(item.session)}
                className="relative block aspect-square w-full overflow-hidden rounded-xl bg-blush"
                aria-label={recordingTitle(item.session.startedAt, LOCALE[lang])}
              >
                {thumbs[item.session.id] && <img src={thumbs[item.session.id]} alt="" className="size-full object-cover" />}
                <span
                  className={`absolute bottom-1.5 left-1.5 size-2.5 rounded-full ring-2 ring-white ${item.sealed ? "bg-verified" : "animate-pulse bg-rani"}`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Writing a journal entry. It is sealed the moment she saves it. */
export function JournalCompose({ setup, onDone }: { setup: DeviceSetup; onDone: () => void }) {
  const lang = setup.language;
  const tr: Tr = (k, v) => t(lang, k, v);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <header className="flex h-14 items-center justify-between">
        <RoundButton label={tr("back")} onClick={onDone}>
          <BackIcon />
        </RoundButton>
        <Wordmark />
        <span className="size-11" />
      </header>
      <section className="mt-6 flex flex-1 flex-col" lang={lang}>
        <p className="label">{tr("journal")}</p>
        <h1 className="mt-1.5 font-display text-[36px] leading-[1.05]">{tr("journalTitle")}</h1>
        <p className="mt-3 text-body-sm leading-relaxed text-muted">{tr("journalBody")}</p>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 8000))}
          placeholder={tr("journalPlaceholder")}
          className="mt-5 min-h-[220px] flex-1 resize-none rounded-2xl border border-hairline p-4 text-body leading-relaxed outline-none focus:border-rani"
        />
      </section>
      <div className="mt-5" lang={lang}>
        <Button
          disabled={busy || !body.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await addJournal(setup, body);
              onDone();
            } finally {
              setBusy(false);
            }
          }}
        >
          {tr("journalSave")}
        </Button>
      </div>
    </Screen>
  );
}

/** A photo she picked (shown from `url`, which the caller owns): an optional note, then it is sealed exactly as it is. */
export function PhotoCompose({ setup, file, url, onDone }: { setup: DeviceSetup; file: File; url: string; onDone: () => void }) {
  const lang = setup.language;
  const tr: Tr = (k, v) => t(lang, k, v);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <header className="flex h-14 items-center justify-between">
        <RoundButton label={tr("back")} onClick={onDone}>
          <BackIcon />
        </RoundButton>
        <Wordmark />
        <span className="size-11" />
      </header>
      <section className="mt-5" lang={lang}>
        <div className="overflow-hidden rounded-sheet bg-plum"><img src={url} alt="" className="max-h-[46vh] w-full object-contain" /></div>
        <label className="mt-5 block">
          <span className="label">{tr("photoNote")}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            placeholder={tr("photoNotePlaceholder")}
            className="mt-2 h-24 w-full resize-none rounded-2xl border border-hairline p-4 text-body-sm leading-relaxed outline-none focus:border-rani"
          />
        </label>
        <p className="mt-2 text-caption leading-relaxed text-muted">{tr("photoExact")}</p>
      </section>
      <div className="mt-auto pt-6" lang={lang}>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await addPhoto(setup, file, note);
              onDone();
            } finally {
              setBusy(false);
            }
          }}
        >
          {tr("photoSeal")}
        </Button>
      </div>
    </Screen>
  );
}

/** One journal entry or photo, decrypted, with its proof. */
export function EvidenceItem({ setup, session, privateKey, onBack }: { setup: DeviceSetup; session: LocalSession; privateKey: CryptoKey; onBack: () => void }) {
  const lang = setup.language;
  const tr: Tr = (k, v) => t(lang, k, v);
  const journal = session.kind === "journal";
  const [opened, setOpened] = useState<OpenedEvidence | null>(null);
  const [pieces, setPieces] = useState<PieceInfo[] | null>(null);
  const [hash, setHash] = useState<string>();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [certificate, setCertificate] = useState(false);

  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    openEvidence(session, privateKey).then(
      (o) => {
        if (!live) return;
        setOpened(o);
        setPieces(o.pieces);
        if (!journal) setUrl((objectUrl = URL.createObjectURL(o.file)));
        // The sealed piece's fingerprint is the fingerprint of the very file she downloads.
        setHash(o.pieces.find((p) => p.kind === (journal ? "text" : "image"))?.sha256);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session, privateKey, journal]);

  const unsealed = !pieces || pieces.some((p) => !p.seal?.confirmed);
  useEffect(() => {
    if (!unsealed) return;
    const id = window.setInterval(() => listPieces(session.id).then(setPieces, () => {}), 8000);
    return () => window.clearInterval(id);
  }, [unsealed, session.id]);

  const main = pieces?.find((p) => p.kind === (journal ? "text" : "image"));
  const uploaded = !!pieces?.length && pieces.every((p) => !p.local);
  const sealed = uploaded && !!main?.seal?.confirmed;
  const verifyUrl = hash && uploaded ? verifyUrlFor(hash) : null;
  const ext = journal ? "txt" : (opened?.meta?.name.split(".").pop() ?? "jpg").toLowerCase();
  const fileName = `${journal ? "note" : "image"}-${fileStamp(session.startedAt)}.${ext}`;

  if (certificate && opened && hash && main) {
    return (
      <Certificate
        lang={lang}
        userId={setup.userId}
        items={[{ label: journal ? "Journal entry" : "Photo", fileName, sha256: hash, bytes: opened.file.size, pieces: [main], verifyUrl: verifyUrlFor(hash) }]}
        onBack={() => setCertificate(false)}
      />
    );
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
          {tr(journal ? "journal" : "photos")} ·{" "}
          {new Date(session.startedAt).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <h1 className="mt-1.5 font-display text-[36px] leading-[1.05]">{recordingTitle(session.startedAt, LOCALE[lang])}</h1>
      </section>

      {journal ? (
        <div className="mt-5 whitespace-pre-wrap rounded-sheet bg-blush p-5 text-body leading-relaxed">
          {opened?.text ?? <span className="text-muted" lang={lang}>{failed ? tr("loadFailed") : tr("decrypting")}</span>}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-sheet bg-plum">
          {url ? (
            <img src={url} alt="" className="max-h-[60vh] w-full object-contain" />
          ) : (
            <p className="flex aspect-[4/3] items-center justify-center px-8 text-center text-body-sm text-on-dark-muted" lang={lang}>
              {failed ? tr("loadFailed") : tr("decrypting")}
            </p>
          )}
        </div>
      )}

      {opened?.meta && (
        <dl className="mt-3" lang={lang}>
          {opened.meta.note && <p className="py-2 text-body-sm leading-relaxed">{opened.meta.note}</p>}
          <Fact k={tr("photoFile")} v={<span className="break-all">{opened.meta.name}</span>} />
          <Fact k={tr("photoFileDate")} v={new Date(opened.meta.lastModified).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" })} />
        </dl>
      )}

      {opened && (
        <ProofPanel
          lang={lang}
          verifyUrl={verifyUrl}
          sealed={sealed}
          lastSeal={main?.seal ?? null}
          hash={hash}
          qrNote={journal ? "qrNoteJournal" : "qrNotePhoto"}
          onDownload={() => downloadBlob(opened.file, fileName)}
          onCertificate={() => setCertificate(true)}
        />
      )}

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
            {tr(journal ? "deleteEntry" : "deletePhoto")}
          </Button>
        )}
      </div>
    </Screen>
  );
}

export function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 fill-none stroke-muted [stroke-width:1.8]">
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}
