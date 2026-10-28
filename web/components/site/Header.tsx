"use client";

// The showcase header, set like a maison's masthead: the name at the centre, flanked by the site's two actions,
// a hairline beneath it with a rani bindi under the name, and the sections below in spaced small capitals.
// Symmetrical, like the arch it sits above. It stays at the top of the page. Below 1024px: menu, name and
// "Try it live", with the sections in a sheet.
import { useRef } from "react";

const SECTIONS = [
  { href: "#story", label: "How it works" },
  { href: "#proof", label: "Proof" },
  { href: "#more", label: "Features" },
  { href: "#hood", label: "Under the hood" },
];
const SHEET = [...SECTIONS, { href: "/verify", label: "Verify a file" }];

const CAPS = "text-[11.5px] font-medium uppercase tracking-[.2em]";

export function Header() {
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex">
              <button
                type="button"
                onClick={() => sheet.current?.showModal()}
                aria-label="Sections"
                aria-haspopup="dialog"
                className="-ml-2.5 flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.5]">
                  <path d="M3 6.5h12M3 11.5h12" />
                </svg>
              </button>
              <a href="/verify" className={`hidden h-9 items-center rounded-full border border-white/20 px-4 text-white transition-colors hover:bg-white/10 lg:flex ${CAPS}`}>
                Verify a file
              </a>
            </div>
            <a href="#top" aria-label="Saakshi">
              <img src="/brand/wordmark-on-dark.svg" alt="" className="h-[26px] lg:h-[30px]" />
            </a>
            <div className="flex justify-end">
              {/* On a phone the pill says just "Try it", so the name stays centred between it and the menu. */}
              <a
                href="#try"
                className={`flex h-9 items-center whitespace-nowrap rounded-full border border-rani-bright/60 px-4 text-white transition-colors hover:border-rani hover:bg-rani ${CAPS}`}
              >
                Try it<span className="max-sm:hidden">&nbsp;live</span>
              </a>
            </div>
          </div>

          {/* A hairline under the name, with a bindi at its centre; it fades out before the margins. */}
          <div aria-hidden className="relative h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.14)_16%,rgba(255,255,255,.14)_84%,transparent)]">
            <i className="absolute left-1/2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rani-bright shadow-[0_0_10px_rgba(255,111,165,.8)]" />
          </div>

          <nav aria-label="Sections" className="hidden h-10 items-center justify-center lg:flex">
            <ul className={`flex items-center text-on-dark ${CAPS}`}>
              {SECTIONS.map((s, i) => (
                <li key={s.href} className="flex items-center">
                  {i > 0 && <i aria-hidden className="mx-6 size-[3px] rounded-full bg-rani-bright/70" />}
                  <a href={s.href} className="group relative py-1.5 transition-colors hover:text-white">
                    {s.label}
                    {/* A rani hairline drawn out from the middle on hover. */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-px origin-center scale-x-0 bg-rani-bright transition-transform duration-300 group-hover:scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <dialog ref={sheet} aria-label="Sections" className="m-0 size-full max-h-none max-w-none border-0 bg-plum-night p-0 text-white">
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="grid h-16 flex-none grid-cols-[1fr_auto_1fr] items-center">
            <button type="button" onClick={close} aria-label="Close" className="-ml-2.5 flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.5]">
                <path d="M2 2l10 10M12 2 2 12" />
              </svg>
            </button>
            <img src="/brand/wordmark-on-dark.svg" alt="Saakshi" className="h-[26px]" />
          </div>
          <div aria-hidden className="relative h-px bg-white/10">
            <i className="absolute left-1/2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rani-bright" />
          </div>
          <ol className="mt-6 animate-rise">
            {SHEET.map((l, i) => (
              <li key={l.href} className="border-b border-white/10">
                <a href={l.href} onClick={close} className="flex items-baseline gap-4 py-4">
                  <span className="w-5 flex-none font-display text-[17px] italic text-rani-bright">{i + 1}</span>
                  <span className="font-display text-[38px] leading-none">{l.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-auto pt-10">
            <a href="#try" onClick={close} className="flex h-14 items-center justify-center rounded-full bg-rani text-[16px] font-medium text-white">
              Try the live app
            </a>
            <p className="label mt-6 text-center text-on-dark-muted!">SHAKTI Hackathon 2026 · Dharma &amp; Trust</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
