"use client";

// The silent SOS screen: plum, calm, nearly dark. It fades to black when untouched, and every
// control on it is at least 56px tall.
import { useEffect, useRef, useState } from "react";
import type { CaptureStatus } from "@/lib/capture";
import { digits, t } from "@/lib/i18n";
import type { Language } from "@/lib/local";
import { sealedCount } from "@/lib/recordings";

const DIM_AFTER_MS = 8000;
const SEAL_POLL_MS = 5000;
const HOLD_MS = 1500;

export interface SosProps {
  lang: Language;
  status: CaptureStatus;
  pending: number;
  countdown: number; // seconds left to undo; 0 once guardians are alerted
  guardianName: string | null;
  onUndo: () => void;
  onHoldStop: () => void;
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  return `${mm}:${String(s % 60).padStart(2, "0")}`;
}

export function Sos({ lang, status, pending, countdown, guardianName, onUndo, onHoldStop }: SosProps) {
  const [now, setNow] = useState(() => Date.now());
  const [dim, setDim] = useState(false);
  const [holding, setHolding] = useState(false);
  const [sealed, setSealed] = useState(0);
  const dimTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const poll = () => sealedCount(status.sessionId).then(setSealed, () => {});
    poll();
    const id = window.setInterval(poll, SEAL_POLL_MS);
    return () => window.clearInterval(id);
  }, [status.sessionId]);

  function wake() {
    setDim(false);
    window.clearTimeout(dimTimer.current);
    dimTimer.current = window.setTimeout(() => setDim(true), DIM_AFTER_MS);
  }

  useEffect(() => {
    dimTimer.current = window.setTimeout(() => setDim(true), DIM_AFTER_MS);
    return () => window.clearTimeout(dimTimer.current);
  }, []);

  function startHold() {
    wake();
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      onHoldStop();
    }, HOLD_MS);
  }
  function endHold() {
    setHolding(false);
    window.clearTimeout(holdTimer.current);
  }

  const saved = Math.max(0, status.pieces - pending);
  const sub = lang !== "en";

  return (
    <main
      onPointerDown={wake}
      className="relative mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden bg-plum-night pt-[max(env(safe-area-inset-top),16px)] text-[#e9dde3] select-none"
    >
      <div className="flex items-center justify-between px-7 pt-3.5">
        <span className="flex items-center gap-2.5 text-[13px] font-medium tracking-[0.18em] text-rani-bright">
          <i className="size-[9px] rounded-full bg-rani-bright shadow-[0_0_0_5px_rgba(255,111,165,.16)]" />
          {t(lang, "rec")} {clock(now - status.startedAt)}
        </span>
        <span className="flex items-center gap-2 text-[13px] text-on-dark-muted">
          <img src="/brand/seal-pink.svg" alt="" className="size-[22px]" />
          {sealed > 0 ? `${digits(lang, sealed)} ${t(lang, "sealedShort")}` : `${digits(lang, saved)} ${t(lang, "saved")}`}
        </span>
      </div>

      <div className="relative mt-4 flex h-[260px] shrink-0 items-center justify-center" aria-hidden>
        <span className="absolute size-[256px] animate-breathe rounded-full border border-rani-bright/12 [animation-delay:600ms]" />
        <span className="absolute size-[184px] animate-breathe rounded-full border border-rani-bright/20 [animation-delay:300ms]" />
        <span className="absolute size-[114px] animate-breathe rounded-full border border-rani-bright/32" />
        <b className="size-4 rounded-full bg-rani-bright shadow-[0_0_30px_8px_rgba(255,111,165,.42)]" />
      </div>

      <div className="-mt-2 text-center">
        <p lang={lang} className={`text-[46px] leading-tight text-white ${lang === "en" ? "font-display" : ""}`}>
          {t(lang, "whisper")}
        </p>
        {sub && <p className="mt-1 text-[15px] text-on-dark-muted">{t("en", "whisper")}</p>}
      </div>

      <div className="mx-6 mt-7 rounded-[20px] border border-[#2a1424] bg-white/[.025] px-[18px] py-1">
        <Row icon={<Disc />} note={t(lang, "now")}>
          {t(lang, "savedRow", { n: digits(lang, saved) })}
          {sealed > 0 && <span className="block text-[12px] text-on-dark-muted">{t(lang, "sealedRow", { n: digits(lang, sealed) })}</span>}
          {pending > 0 && <span className="block text-[12px] text-on-dark-muted">{t(lang, "waiting", { n: digits(lang, pending) })}</span>}
        </Row>
        {status.mode !== "video" && <Row icon={<Mic />}>{t(lang, status.mode === "audio" ? "audioOnly" : "locationOnly")}</Row>}
        {countdown > 0 ? (
          <div className="flex items-center gap-3.5 border-b border-[#211019] py-2 text-[15px] last:border-0">
            <Pin />
            <span className="flex-1">{t(lang, "alertIn", { n: digits(lang, countdown) })}</span>
            <button
              type="button"
              onClick={onUndo}
              className="h-14 min-w-[88px] rounded-full border border-plum-line px-5 text-[15px] font-medium text-white"
            >
              {t(lang, "undo")}
            </button>
          </div>
        ) : (
          <Row icon={<Pin />} note={guardianName ? t(lang, "live") : undefined}>
            {guardianName ? t(lang, "guardianLive", { name: guardianName }) : t(lang, "noGuardian")}
          </Row>
        )}
        <Row icon={<Lock />}>{t(lang, "duressArmed")}</Row>
      </div>

      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-x-6 bottom-[calc(max(env(safe-area-inset-bottom),0px)+62px)] h-[60px] overflow-hidden rounded-full border border-plum-line text-[16px] text-on-dark"
      >
        <span
          className="absolute inset-y-0 left-0 bg-plum-surface ease-linear"
          style={{ width: holding ? "100%" : "0%", transition: `width ${holding ? HOLD_MS : 150}ms linear` }}
        />
        <span className="relative">{t(lang, "holdToStop")}</span>
      </button>
      <p className="absolute inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),0px)+32px)] text-center text-[12px] text-[#5f4b57]">
        {t(lang, "holdNote")}
      </p>

      <div
        aria-hidden
        className={`absolute inset-0 z-10 bg-black transition-opacity duration-[1200ms] ${dim ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
    </main>
  );
}

function Row({ icon, note, children }: { icon: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-[#211019] py-3.5 text-[15px] last:border-0">
      {icon}
      <span className="flex-1">{children}</span>
      {note && <small className="text-[12px] text-[#7d6875]">{note}</small>}
    </div>
  );
}

const ic = "flex-none fill-none stroke-rani-bright [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]";
const Disc = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className={ic}>
    <circle cx="10" cy="10" r="8" />
    <path d="M10 5.5c1.6 1.6 1.6 7.4 0 9-1.6-1.6-1.6-7.4 0-9z" />
  </svg>
);
const Pin = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className={ic}>
    <path d="M10 18s6-5.2 6-10a6 6 0 0 0-12 0c0 4.8 6 10 6 10z" />
    <circle cx="10" cy="8" r="2" />
  </svg>
);
const Lock = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className={ic}>
    <rect x="4" y="9" width="12" height="9" rx="2" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </svg>
);
const Mic = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" className={ic}>
    <rect x="7" y="2.5" width="6" height="10" rx="3" />
    <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" />
  </svg>
);
