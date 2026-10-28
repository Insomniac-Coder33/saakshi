"use client";

// The showcase header: a capsule of frosted plum glass at the top of the hero, its edge catching rani light at
// both ends, with the mark from the arch beside the wordmark. It stays where it is; below 1024px the links move
// into a full-screen sheet.
import { useRef } from "react";

const LINKS = [
  { href: "#story", label: "How it works" },
  { href: "#proof", label: "Proof" },
  { href: "#more", label: "Features" },
  { href: "#hood", label: "Under the hood" },
  { href: "/verify", label: "Verify a file" },
];

export function Header() {
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();

  return (
    <>
      {/* The capsule's padding lines it up with the page's margins at every width. */}
      <header className="absolute inset-x-0 top-0 z-40 pt-3.5">
        <nav className="glass mx-auto flex h-14 max-w-[1160px] items-center justify-between gap-4 rounded-full pl-2.5 pr-1.5 max-md:mx-3 md:mx-5 min-[75rem]:mx-auto">
          <a href="#top" aria-label="Saakshi" className="flex flex-none items-center gap-2.5">
            <img src="/brand/mark.svg" alt="" className="size-[34px] drop-shadow-[0_0_10px_rgba(255,111,165,.45)]" />
            <img src="/brand/wordmark-on-dark.svg" alt="" className="h-6" />
          </a>
          <ul className="hidden items-center gap-0.5 text-[14px] text-on-dark lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="block rounded-full px-3.5 py-2 transition-colors hover:bg-white/[.07] hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-none items-center gap-1">
            <a
              href="#try"
              className="flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(180deg,#e8407f,#c81d63)] px-5 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_10px_24px_-10px_rgba(214,36,110,.9)] transition-[filter] hover:brightness-110"
            >
              <i aria-hidden className="size-1.5 rounded-full bg-white" />
              Try it live
            </a>
            <button
              type="button"
              onClick={() => sheet.current?.showModal()}
              aria-label="Sections"
              aria-haspopup="dialog"
              className="flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.6]">
                <path d="M3 6.5h12M3 11.5h12" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <dialog ref={sheet} aria-label="Sections" className="m-0 size-full max-h-none max-w-none border-0 bg-plum-night p-0 text-white">
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="flex h-[84px] flex-none items-center justify-between">
            <span className="flex items-center gap-2.5">
              <img src="/brand/mark.svg" alt="" className="size-[34px]" />
              <img src="/brand/wordmark-on-dark.svg" alt="Saakshi" className="h-6" />
            </span>
            <button type="button" onClick={close} aria-label="Close" className="-mr-2 flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.6]">
                <path d="M2 2l10 10M12 2 2 12" />
              </svg>
            </button>
          </div>
          <ol className="mt-4 animate-rise">
            {LINKS.map((l, i) => (
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
