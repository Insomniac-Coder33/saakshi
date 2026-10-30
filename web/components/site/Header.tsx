"use client";

import { useRef } from "react";

const SECTIONS = [
  { href: "#story", label: "How it works" },
  { href: "#proof", label: "The proof" },
  { href: "#more", label: "Features" },
  { href: "#hood", label: "Technology" },
];

export function Header() {
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();

  return (
    <>
      {/* Over the hero and still: it scrolls away with the page. The sections sit centred over the centred headline. */}
      <header className="absolute inset-x-0 top-0 z-40 text-white">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between gap-6 border-b border-white/10 px-6 md:px-10 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <a href="#top" aria-label="Saakshi, back to top" className="flex shrink-0 items-center">
            <img src="/brand/wordmark-on-dark.svg" alt="Saakshi" className="h-[26px] sm:h-[30px]" />
          </a>

          <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
            {SECTIONS.map((section) => (
              <a key={section.href} href={section.href} className="text-[14px] text-on-dark transition-colors hover:text-white">
                {section.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3 sm:gap-6">
            <a href="/verify" className="hidden text-[14px] text-on-dark transition-colors hover:text-white sm:block">
              Verify a file
            </a>
            <a
              href="#try"
              className="inline-flex h-10 items-center rounded-full border border-white/25 px-5 text-[14px] font-medium text-white transition-colors hover:border-rani-bright hover:bg-white/5"
            >
              Try it<span className="max-sm:hidden">&nbsp;live</span>
            </a>
            <button
              type="button"
              onClick={() => sheet.current?.showModal()}
              aria-label="Open menu"
              aria-haspopup="dialog"
              className="flex size-10 items-center justify-center rounded-full border border-white/20 lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.5]">
                <path d="M3 6.5h12M3 11.5h12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <dialog ref={sheet} aria-label="Site menu" className="m-0 size-full max-h-none max-w-none border-0 bg-plum-night p-0 text-white">
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="flex h-[76px] items-center justify-between border-b border-white/10">
            <img src="/brand/wordmark-on-dark.svg" alt="Saakshi" className="h-[27px]" />
            <button type="button" onClick={close} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-full border border-white/15">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.5]">
                <path d="M2 2l10 10M12 2 2 12" />
              </svg>
            </button>
          </div>
          <nav aria-label="Mobile sections" className="mt-9">
            {[...SECTIONS, { href: "/verify", label: "Verify a file" }].map((section, i) => (
              <a key={section.href} href={section.href} onClick={close} className="flex items-baseline gap-5 border-b border-white/10 py-5">
                <span className="font-display text-[17px] italic text-rani-bright">0{i + 1}</span>
                <span className="font-display text-[36px] leading-none">{section.label}</span>
              </a>
            ))}
          </nav>
          <a href="#try" onClick={close} className="mt-auto flex h-14 items-center justify-center rounded-full bg-rani text-[15px] font-medium">
            Try the live app
          </a>
        </div>
      </dialog>
    </>
  );
}
