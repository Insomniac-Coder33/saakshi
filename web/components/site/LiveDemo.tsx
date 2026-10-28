"use client";

// The real app, running inside a phone on the showcase page. It loads only when asked, so passing
// visitors and crawlers don't create accounts, and it gets its own storage, separate from any real
// Saakshi on this device. "Full size" reopens the same dialog as a modal instead of moving the frame,
// so the app never reloads and stays on whatever screen she was on.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { APP_ORIGIN, DEMO_DURESS_PIN, DEMO_PIN } from "@/lib/site";
import { Phone, Screenshot } from "./Phone";
import { Key, TrySteps } from "./TrySteps";

const W = 393;
const H = 852;
// Smaller than this and the app's text is hard to read, so starting it opens the full-size view instead.
const MIN_SCALE = 0.6;

export function LiveDemo({ caption }: { caption?: ReactNode }) {
  const [on, setOn] = useState(false);
  const [run, setRun] = useState(0);
  const [big, setBig] = useState(false);
  // The app is laid out 393 wide and scaled to the glass; its height is whatever fills the glass at that scale,
  // which runs a little taller than 852 because the bezel takes the same off both sides.
  const [fit, setFit] = useState({ scale: 0.7, height: H });
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const scale = e.contentRect.width / W;
      setFit({ scale, height: Math.round(e.contentRect.height / scale) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Each switch happens within one task, so no frame is ever drawn without the phone.
  const enlarge = useCallback(() => {
    const d = frame.current;
    if (!d || d.matches(":modal")) return;
    flushSync(() => {
      setOn(true);
      setBig(true);
    });
    d.close();
    d.showModal();
  }, []);

  const shrink = useCallback(() => {
    const d = frame.current;
    if (!d) return;
    d.close();
    d.show();
    flushSync(() => setBig(false));
    opener.current?.focus({ preventScroll: true });
  }, []);

  // On a phone, or wherever the phone on the page is too small to read, starting goes straight to full size.
  const wantsBig = useCallback(() => matchMedia("(max-width: 639px)").matches || (box.current?.clientWidth ?? W) / W < MIN_SCALE, []);
  const start = useCallback(() => (wantsBig() ? enlarge() : setOn(true)), [wantsBig, enlarge]);

  useEffect(() => {
    const d = frame.current;
    if (!d) return;
    const cancel = (e: Event) => {
      e.preventDefault();
      shrink();
    };
    // If the browser closes it anyway (Esc twice with no click in between), the phone goes back on the page.
    const closed = () => {
      if (d.open) return;
      d.show();
      flushSync(() => setBig(false));
    };
    d.addEventListener("cancel", cancel);
    d.addEventListener("close", closed);
    return () => {
      d.removeEventListener("cancel", cancel);
      d.removeEventListener("close", closed);
    };
  }, [shrink]);

  // The page's "Try it live" links (#try) start the app as well as scrolling to it: that click is the asking.
  // The scroll happens here rather than by following the link, which would pull focus out of the full-size view.
  // It jumps when the app opens full size, since the page is covered and a glide would be cut short.
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!(e.target instanceof Element && e.target.closest('a[href="#try"]'))) return;
      e.preventDefault();
      document.getElementById("try")?.scrollIntoView({ behavior: wantsBig() ? "instant" : "auto" });
      start();
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [wantsBig, start]);

  return (
    <dialog
      ref={frame}
      open
      aria-label="Saakshi, live"
      className={
        big
          ? "fixed inset-0 m-0 flex size-full max-h-none max-w-none flex-col border-0 bg-plum-night/90 p-0 text-white backdrop-blur-xl md:flex-row md:items-center md:justify-center md:gap-14"
          : "static m-0 block w-full max-w-none border-0 bg-transparent p-0 text-inherit"
      }
    >
      {big && (
        <>
          {/* Narrow screens: a slim bar with what to type. Wider: just the close button, in the corner. */}
          <div className="flex flex-none items-center gap-3 border-b border-white/10 py-2 pl-4 pr-2 md:absolute md:right-5 md:top-5 md:border-0 md:p-0">
            <p className="flex-1 text-[12.5px] leading-[1.7] text-on-dark md:hidden">
              PIN <Key>{DEMO_PIN}</Key> then <Key>=</Key>. SOS: tap the display three times. Duress <Key>{DEMO_DURESS_PIN}</Key>.
            </p>
            <button
              type="button"
              onClick={shrink}
              aria-label="Back to the page"
              className="flex size-11 flex-none items-center justify-center rounded-full text-white hover:bg-white/10 md:border md:border-white/15"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.6]">
                <path d="M2 2l10 10M12 2 2 12" />
              </svg>
            </button>
          </div>
          <div className="hidden w-[256px] flex-none md:block">
            <p className="label text-rani-bright!">Saakshi, live</p>
            <TrySteps className="mt-6 space-y-5 text-[14px] leading-[1.5] text-on-dark-muted" />
            <div className="mt-10 flex gap-5 text-[13px] text-on-dark-muted">
              <button type="button" onClick={() => setRun((n) => n + 1)} className="underline-offset-4 hover:text-white hover:underline">
                Restart
              </button>
              <a href={`${APP_ORIGIN}/?demo`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-white hover:underline">
                Open in its own tab ↗
              </a>
            </div>
          </div>
        </>
      )}

      {/* Phones: the app fills the screen under the bar, without a bezel. Wider: the phone, as tall as fits. */}
      <div className={big ? "flex min-h-0 flex-1 items-center justify-center md:flex-none" : undefined}>
        <Phone
          className={
            big
              ? "max-sm:aspect-auto max-sm:size-full max-sm:rounded-none max-sm:p-0 max-sm:shadow-none max-sm:ring-0 sm:w-[min(411px,calc((100svh_-_100px)*0.4613))] md:w-[min(411px,calc((100svh_-_40px)*0.4613))]"
              : ""
          }
          screenClassName={big ? "max-sm:rounded-none" : ""}
        >
          <div ref={box} className="size-full">
            {on ? (
              <iframe
                key={run}
                title="Saakshi, live"
                src={`${APP_ORIGIN}/?demo`}
                allow="camera; microphone; geolocation; screen-wake-lock; clipboard-write"
                style={{ width: W, height: fit.height, transform: `scale(${fit.scale})`, transformOrigin: "0 0" }}
                className="border-0 bg-calc"
              />
            ) : (
              // The start button sits in the calculator's empty top, so every key below stays whole.
              <button type="button" onClick={start} className="group relative size-full text-left">
                <Screenshot src="/site/calculator.webp" alt="Saakshi’s calculator" tone="dark" fade={false} eager />
                <span className="absolute inset-x-0 top-[8%] flex flex-col items-center gap-2.5">
                  <span className="flex h-12 items-center gap-2.5 rounded-full bg-rani px-6 text-[15px] font-medium text-white shadow-[0_10px_30px_-8px_rgba(214,36,110,.8)] transition-transform group-hover:scale-[1.03]">
                    <svg width="13" height="13" viewBox="0 0 14 14" className="fill-current">
                      <path d="M3 1.8v10.4L12 7z" />
                    </svg>
                    Start the live app
                  </span>
                  <span className="text-[12px] text-white/60">Runs right here. No install.</span>
                </span>
              </button>
            )}
          </div>
        </Phone>
      </div>

      {!big &&
        (on ? (
          <div className="mt-4 flex justify-center gap-5 text-[13px] text-on-dark-muted">
            <button ref={opener} type="button" onClick={enlarge} className="flex items-center gap-1.5 font-medium text-white underline-offset-4 hover:underline">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.4]">
                <path d="M1 4.5V1h3.5M7.5 1H11v3.5M11 7.5V11H7.5M4.5 11H1V7.5" />
              </svg>
              Full size
            </button>
            <button type="button" onClick={() => setRun((n) => n + 1)} className="underline-offset-4 hover:text-white hover:underline">
              Restart
            </button>
          </div>
        ) : (
          caption
        ))}
    </dialog>
  );
}
