"use client";

// Inside Saakshi, after her PIN: a manual SOS, her evidence (recordings, journal, photos) and settings.
import { useCallback, useEffect, useState } from "react";
import { digits, t, type StringKey } from "@/lib/i18n";
import type { DeviceSetup, Language, LocalSession } from "@/lib/local";
import { listRecordings, recordingTitle, type RecordingSummary } from "@/lib/recordings";
import { onSynced } from "@/lib/sync";
import { Chevron, EvidenceItem, JournalCompose, JournalList, PhotoCompose, PhotoGrid } from "./Evidence";
import { Recording } from "./Recording";
import { Sahayak } from "./Sahayak";
import { Settings } from "./Settings";
import { Button, LockIcon, RoundButton, Screen, Wordmark } from "./ui";

export interface VaultProps {
  setup: DeviceSetup;
  privateKey: CryptoKey;
  recording: boolean; // a capture is running (for example after the duress PIN)
  onLock: () => void;
  onStartSos: () => void;
  onStopCapture: () => void;
  onSetupChange: (s: DeviceSetup) => void;
  onErased: () => void;
}

export const LOCALE: Record<Language, string> = { en: "en-IN", bn: "bn-IN", hi: "hi-IN" };

type Tab = "recordings" | "journal" | "photos";
type View = "home" | "settings" | "write" | "sahayak" | { id: string } | { photo: File; url: string } | { item: LocalSession };
const TABS: { id: Tab; label: StringKey }[] = [
  { id: "recordings", label: "recordings" },
  { id: "journal", label: "journal" },
  { id: "photos", label: "photos" },
];

export function Vault(props: VaultProps) {
  const { setup, privateKey, recording, onLock, onStartSos, onStopCapture } = props;
  const lang = setup.language;
  const tr = (k: StringKey, v?: Record<string, string | number>) => t(lang, k, v);
  const [view, setView] = useState<View>("home");
  const [tab, setTab] = useState<Tab>("recordings");
  const [items, setItems] = useState<RecordingSummary[] | null>(null);

  const refresh = useCallback(() => {
    listRecordings().then(setItems, () => setItems([]));
  }, []);

  useEffect(() => {
    refresh();
    return onSynced(refresh);
  }, [refresh]);

  const home = () => {
    if (typeof view === "object" && "url" in view) URL.revokeObjectURL(view.url);
    setView("home");
    refresh();
  };
  if (view === "settings") return <Settings {...props} onBack={() => setView("home")} />;
  if (view === "write") return <JournalCompose setup={setup} onDone={home} />;
  if (view === "sahayak") return <Sahayak setup={setup} privateKey={privateKey} onBack={home} />;
  if (typeof view === "object" && "photo" in view) return <PhotoCompose setup={setup} file={view.photo} url={view.url} onDone={home} />;
  if (typeof view === "object" && "item" in view) return <EvidenceItem setup={setup} session={view.item} privateKey={privateKey} onBack={home} />;
  if (typeof view === "object") {
    const item = items?.find((i) => i.session.id === view.id);
    if (item)
      return (
        <Recording
          lang={lang}
          userId={setup.userId}
          summary={item}
          privateKey={privateKey}
          onBack={() => {
            setView("home");
            refresh();
          }}
        />
      );
  }

  return (
    <Screen>
      <header className="flex h-14 items-center justify-between">
        <Wordmark />
        <RoundButton label={tr("lock")} onClick={onLock}>
          <LockIcon />
        </RoundButton>
      </header>

      <section className="mt-8 animate-rise" lang={lang}>
        <h1 className="font-display text-h1 leading-[1.05]">
          {setup.name ? tr("hello", { name: setup.name }) : tr("helloAnon")}
        </h1>
        <p className="mt-3 text-body leading-relaxed text-muted">{tr("vaultBody")}</p>
      </section>

      <section className="mt-8" lang={lang}>
        {recording ? (
          <div className="rounded-[20px] bg-plum p-5 text-on-dark">
            <p className="flex items-center gap-2.5 text-[13px] font-medium tracking-[0.18em] text-rani-bright">
              <i className="size-[9px] animate-pulse rounded-full bg-rani-bright" />
              {tr("recordingNow").toUpperCase()}
            </p>
            <Button className="mt-4" onClick={onStopCapture}>
              {tr("stopRecording")}
            </Button>
          </div>
        ) : (
          <>
            <Button onClick={onStartSos}>{tr("startSos")}</Button>
            <p className="mt-3 text-center text-caption text-muted">{tr("sosTip")}</p>
          </>
        )}
      </section>

      <button
        type="button"
        onClick={() => setView("sahayak")}
        className="mt-8 flex w-full items-center gap-4 rounded-[20px] border border-hairline p-4 text-left active:bg-blush"
        lang={lang}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-alert-bg text-rani">
          <svg width="20" height="20" viewBox="0 0 20 20" className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
            <path d="M10 3v14M5 17h10M3 7h14M5.5 7 3 12a2.5 2.5 0 0 0 5 0L5.5 7ZM14.5 7 12 12a2.5 2.5 0 0 0 5 0l-2.5-5Z" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block text-body font-medium">{tr("sahayakCard")}</span>
          <span className="mt-0.5 block text-caption leading-snug text-muted">{tr("sahayakCardBody")}</span>
        </span>
        <Chevron />
      </button>

      <div role="tablist" className="mt-8 grid grid-cols-3 rounded-full bg-blush p-1" lang={lang}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`h-11 rounded-full text-body-sm font-medium transition-colors ${tab === x.id ? "bg-white text-ink shadow-card" : "text-muted"}`}
          >
            {tr(x.label)}
          </button>
        ))}
      </div>

      <section className="mt-5" lang={lang}>
        {tab === "journal" ? (
          <JournalList lang={lang} privateKey={privateKey} onWrite={() => setView("write")} onOpen={(s) => setView({ item: s })} />
        ) : tab === "photos" ? (
          <PhotoGrid lang={lang} privateKey={privateKey} onAdd={(f) => setView({ photo: f, url: URL.createObjectURL(f) })} onOpen={(s) => setView({ item: s })} />
        ) : items === null ? (
          <div className="mt-4 h-20 animate-pulse rounded-card bg-blush" />
        ) : items.length === 0 ? (
          <p className="mt-3 border-t border-hairline pt-4 text-body-sm leading-relaxed text-muted">{tr("emptyRecordings")}</p>
        ) : (
          <ul className="mt-2">
            {items.map((item) => (
              <li key={item.session.id}>
                <button
                  type="button"
                  onClick={() => setView({ id: item.session.id })}
                  className="flex w-full items-center gap-4 border-b border-hairline py-4 text-left"
                >
                  <span className="flex-1">
                    <span className="block font-display text-h3 leading-tight">
                      {recordingTitle(item.session.startedAt, LOCALE[lang])}
                    </span>
                    <span className="mt-1 block text-caption text-muted">
                      {tr("pieces", { n: digits(lang, item.pieces) })} ·{" "}
                      {item.pending ? tr("uploading", { n: digits(lang, item.pending) }) : tr("allSaved")} ·{" "}
                      {item.sealed >= item.pieces
                        ? tr("allSealed")
                        : tr("sealedOf", { n: digits(lang, item.sealed), total: digits(lang, item.pieces) })}
                      {item.session.duress && <span className="text-rani"> · {tr("duressFlag")}</span>}
                    </span>
                  </span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => setView("settings")}
        className="mt-auto flex h-14 items-center justify-center text-body-sm font-medium text-muted"
        lang={lang}
      >
        {tr("settings")}
      </button>
    </Screen>
  );
}
