"use client";

// The showcase header: a frosted capsule that floats over the page and stays. Over the hero it is glass on the
// dark; further down it takes the tone of whichever section passes behind it. A rani thread along its lower edge
// grows as she reads, and a bindi marks the section she's in. Below 1024px the links move into a full-screen sheet.
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "#story", label: "How it works" },
  { href: "#proof", label: "Proof" },
  { href: "#more", label: "Features" },
  { href: "#hood", label: "Under the hood" },
  { href: "/verify", label: "Verify a file" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(true);
  const [here, setHere] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();
  const light = !dark;

  // Once a frame while scrolling: has she left the top, and is the section behind the capsule dark or light?
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 16);
      const behind = document.elementsFromPoint(window.innerWidth / 2, 40).find((el) => !bar.current?.contains(el));
      setDark(!!behind?.closest('[data-tone="dark"]'));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // The section crossing the middle of the screen is the one she's reading; between them, none is.
  useEffect(() => {
    const inView = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = `#${e.target.id}`;
          if (e.isIntersecting) inView.add(id);
          else inView.delete(id);
        }
        setHere([...inView][0] ?? null);
      },
      { rootMargin: "-49% 0px -50% 0px" },
    );
    for (const l of LINKS) {
      const el = l.href.startsWith("#") ? document.getElementById(l.href.slice(1)) : null;
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* The wrapper lets clicks through around the capsule; the capsule's padding lines the wordmark up with the copy. */}
      <header ref={bar} className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-3">
        <nav
          className={`pointer-events-auto relative mx-auto flex h-14 max-w-[1160px] items-center justify-between gap-6 rounded-full border pl-3 pr-1.5 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 max-md:mx-3 md:mx-5 md:pl-5 min-[75rem]:mx-auto ${
            light
              ? "border-ink/[.08] bg-white/80 shadow-[0_14px_34px_-20px_rgba(29,20,25,.45)]"
              : scrolled
                ? "border-white/10 bg-plum-night/75 shadow-[0_14px_34px_-18px_rgba(0,0,0,.8)]"
                : "border-white/10 bg-white/[.04]"
          }`}
        >
          <a href="#top" aria-label="Saakshi, back to the top" className="flex-none">
            <img src="/brand/wordmark-on-dark.svg" alt="" className={`h-6 ${light ? "hidden" : ""}`} />
            <img src="/brand/wordmark-on-light.svg" alt="" className={`h-6 ${light ? "" : "hidden"}`} />
          </a>
          <ul className={`hidden items-center gap-7 text-[14px] transition-colors lg:flex ${light ? "text-muted" : "text-on-dark"}`}>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={here === l.href ? "location" : undefined}
                  className={`relative block py-2 transition-colors ${light ? "hover:text-ink aria-[current]:text-ink" : "hover:text-white aria-[current]:text-white"}`}
                >
                  {l.label}
                  {/* The bindi from the wordmark's i, under the section she's in. */}
                  <i
                    aria-hidden
                    className={`absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full transition-transform duration-300 ${light ? "bg-rani" : "bg-rani-bright"} ${here === l.href ? "scale-100" : "scale-0"}`}
                  />
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-none items-center gap-1">
            <a
              href="#try"
              className={`flex h-11 items-center rounded-full px-5 text-[14px] font-medium text-white transition-colors ${scrolled ? "bg-rani hover:bg-rani-deep" : "bg-white/10 hover:bg-white/[.16]"}`}
            >
              Try it live
            </a>
            <button
              type="button"
              onClick={() => sheet.current?.showModal()}
              aria-label="Sections"
              aria-haspopup="dialog"
              className={`flex size-11 items-center justify-center rounded-full lg:hidden ${light ? "text-ink hover:bg-ink/5" : "text-white hover:bg-white/10"}`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.6]">
                <path d="M3 6.5h12M3 11.5h12" />
              </svg>
            </button>
          </div>
          {/* The thread: a hairline along the capsule's lower edge that grows as she reads, like the thread the steps
              are strung on. It stops short of the rounded ends. */}
          <span
            aria-hidden
            className={`thread pointer-events-none absolute inset-x-8 -bottom-px h-px ${light ? "bg-rani" : "bg-rani-bright/90 shadow-[0_0_8px_rgba(255,111,165,.55)]"}`}
          />
        </nav>
      </header>

      <dialog ref={sheet} aria-label="Sections" className="m-0 size-full max-h-none max-w-none border-0 bg-plum-night p-0 text-white">
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="flex h-[72px] flex-none items-center justify-between">
            <img src="/brand/wordmark-on-dark.svg" alt="Saakshi" className="h-[26px]" />
            <button type="button" onClick={close} aria-label="Close" className="-mr-2 flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.6]">
                <path d="M2 2l10 10M12 2 2 12" />
              </svg>
            </button>
          </div>
          <ol className="mt-6 animate-rise">
            {LINKS.map((l, i) => (
              <li key={l.href} className="border-b border-white/10">
                <a href={l.href} onClick={close} aria-current={here === l.href ? "location" : undefined} className="flex items-baseline gap-4 py-4">
                  <span className="w-5 flex-none font-display text-[17px] italic text-rani-bright">{i + 1}</span>
                  <span className="font-display text-[38px] leading-none">{l.label}</span>
                  {here === l.href && <i aria-hidden className="ml-auto size-1.5 flex-none self-center rounded-full bg-rani-bright" />}
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
