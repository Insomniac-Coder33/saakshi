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
  const [scale, setScale] = useState(0.7);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
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
              style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
              className="border-0 bg-calc"
            />
          ) : (
            <button type="button" onClick={() => setOn(true)} className="group relative size-full text-left">
              <Screenshot src="/site/calculator.webp" alt="Saakshi’s calculator" />
              <span className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent pb-14">
                <span className="flex h-14 items-center gap-2.5 rounded-full bg-rani px-7 text-[16px] font-medium text-white shadow-[0_10px_30px_-8px_rgba(214,36,110,.8)] transition-transform group-hover:scale-[1.03]">
                  <svg width="14" height="14" viewBox="0 0 14 14" className="fill-current">
                    <path d="M3 1.8v10.4L12 7z" />
                  </svg>
                  Start the live app
                </span>
                <span className="text-[13px] text-white/70">Runs right here. No install.</span>
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
