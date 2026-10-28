"use client";

// The real app, running inside a phone on the showcase page. It loads only when asked, so passing
// visitors and crawlers don't create accounts, and it gets its own storage, separate from any real
// Saakshi on this device.
import { useEffect, useRef, useState } from "react";
import { APP_ORIGIN } from "@/lib/site";
import { Phone, Screenshot } from "./Phone";

const W = 393;
const H = 852;

export function LiveDemo({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [run, setRun] = useState(0);
  // The app is laid out 393 wide and scaled to the glass; its height is whatever fills the glass at that scale,
  // which runs a little taller than 852 because the bezel takes the same off both sides.
  const [fit, setFit] = useState({ scale: 0.7, height: H });
  const box = useRef<HTMLDivElement>(null);

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

  // The page's "Try it live" links (#try) start the app as well as scrolling to it: that click is the asking.
  useEffect(() => {
    const start = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('a[href="#try"]')) setOn(true);
    };
    document.addEventListener("click", start);
    return () => document.removeEventListener("click", start);
  }, []);

  return (
    <div className={className}>
      <Phone>
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
            <button type="button" onClick={() => setOn(true)} className="group relative size-full text-left">
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
      {on && (
        <div className="mt-4 flex justify-center gap-5 text-[13px] text-on-dark-muted">
          <button type="button" onClick={() => setRun((n) => n + 1)} className="underline-offset-4 hover:text-white hover:underline">
            Restart
          </button>
          <a href={`${APP_ORIGIN}/?demo`} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-white hover:underline">
            Open in its own tab ↗
          </a>
        </div>
      )}
    </div>
  );
}
