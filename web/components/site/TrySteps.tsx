// How to try the live app, shared by the hero and the live app's full-size view.
import type { ReactNode } from "react";
import { DEMO_DURESS_PIN, DEMO_PIN } from "@/lib/site";

export function Key({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/15 bg-white/[.06] px-1.5 py-0.5 font-mono text-[13px] text-white">{children}</kbd>;
}

export function Bead({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 items-center justify-center rounded-full bg-plum-night font-display text-[15px] italic leading-none text-rani-bright ring-1 ring-rani-bright/45 ${className}`}
    >
      {n}
    </span>
  );
}

/** The four steps, as numbered beads on a thread. `onArch`: from lg up the thread is the hero arch's left leg. */
export function TrySteps({ onArch = false, className = "" }: { onArch?: boolean; className?: string }) {
  return (
    <ol aria-label="Try the live app" className={className}>
      <TryStep n={1} onArch={onArch}>
        It’s a working calculator. Try a sum.
      </TryStep>
      <TryStep n={2} onArch={onArch}>
        Type{" "}
        <span className="whitespace-nowrap">
          <Key>{DEMO_PIN}</Key> then <Key>=</Key>
        </span>{" "}
        to open Saakshi.
      </TryStep>
      <TryStep n={3} onArch={onArch}>
        From the calculator, tap the display three times for a silent SOS. Allow the camera: it’s real.
      </TryStep>
      <TryStep n={4} onArch={onArch}>
        Hold to stop, then{" "}
        <span className="whitespace-nowrap">
          <Key>{DEMO_PIN}</Key> <Key>=</Key> again
        </span>{" "}
        and open the recording to watch it get sealed.
        <span className="mt-2 block">
          Duress PIN <Key>{DEMO_DURESS_PIN}</Key>
        </span>
      </TryStep>
    </ol>
  );
}

// On the arch, the bead moves to the right of the text, onto the leg.
function TryStep({ n, onArch, children }: { n: number; onArch: boolean; children: ReactNode }) {
  return (
    <li
      className={`relative pl-10 before:absolute before:-bottom-5 before:left-3 before:top-7 before:w-px before:bg-white/12 last:before:hidden ${onArch ? "lg:pl-0 lg:text-balance lg:before:hidden" : ""}`}
    >
      <Bead n={n} className={`absolute left-0 top-[-2px] ${onArch ? "lg:left-auto lg:right-[-36px]" : ""}`} />
      {children}
    </li>
  );
}
