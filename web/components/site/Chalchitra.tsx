// The chalchitra: in a Kumartuli pratima, the arch that frames Durga. Here it frames the live phone,
// with the seal's words along its curve and the third eye from our mark watching from the top.
// Drawn in a 372 × 825 box; the phone sits 46 in from each side, so the arch keeps the same distance
// from its rounded corners all the way round.
import type { ReactNode } from "react";

const INNER = "M 18 825 V 192 A 168 168 0 0 1 354 192 V 825";
const OUTER = "M 0 825 V 192 A 186 186 0 0 1 372 192 V 825";

export function Chalchitra({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-[372/825] ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[34%] size-[165%] -translate-x-1/2 -translate-y-1/2 animate-glow rounded-full bg-[radial-gradient(closest-side,rgba(214,36,110,.3),rgba(214,36,110,.08)_55%,transparent)]"
      />
      <svg aria-hidden viewBox="0 0 372 825" className="absolute inset-0 size-full overflow-visible">
        <defs>
          {/* The legs dissolve into the night instead of ending on a line. */}
          <linearGradient id="cc-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="825">
            <stop offset="0.62" stopColor="#ff6fa5" />
            <stop offset="1" stopColor="#ff6fa5" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cc-niche" gradientUnits="userSpaceOnUse" cx="186" cy="96" r="300">
            <stop offset="0" stopColor="#ff6fa5" stopOpacity=".15" />
            <stop offset="1" stopColor="#ff6fa5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cc-halo">
            <stop offset="0" stopColor="#ff6fa5" stopOpacity=".5" />
            <stop offset="1" stopColor="#ff6fa5" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cc-bindi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6fa5" />
            <stop offset="1" stopColor="#d6246e" />
          </linearGradient>
          <path id="cc-band" d="M 9 192 A 177 177 0 0 1 363 192" />
        </defs>

        <path d={`${INNER} Z`} fill="url(#cc-niche)" />
        <path d={INNER} fill="none" stroke="url(#cc-fade)" strokeOpacity=".44" vectorEffect="non-scaling-stroke" />
        <path d={OUTER} fill="none" stroke="url(#cc-fade)" strokeOpacity=".28" vectorEffect="non-scaling-stroke" />
        <text fill="#ff6fa5" fillOpacity=".75" textAnchor="middle" dominantBaseline="central" className="font-sans text-[9.5px] font-medium tracking-[.32em]">
          <textPath href="#cc-band" startOffset="50%">
            WITNESSED · SEALED · BELIEVED
          </textPath>
        </text>
        <circle cx="0" cy="192" r="2.5" fill="#ff6fa5" fillOpacity=".7" />
        <circle cx="372" cy="192" r="2.5" fill="#ff6fa5" fillOpacity=".7" />

        {/* The mark itself: the third eye inside a rani bindi. */}
        <g transform="translate(186 86)">
          <circle r="60" fill="url(#cc-halo)" className="origin-center animate-glow [transform-box:fill-box]" />
          <circle r="19" fill="url(#cc-bindi)" />
          {/* Chokkhu daan: the eye opens once, the way the goddess's eyes are painted in last. */}
          <g className="origin-center animate-open-eye [transform-box:fill-box]">
            <path d="M 0 -11.4 A 15.23 15.23 0 0 1 0 11.4 A 15.23 15.23 0 0 1 0 -11.4 Z" fill="#1c0914" />
            <circle r="2.5" fill="#ff6fa5" />
          </g>
        </g>
      </svg>
      <div className="absolute left-[12.366%] top-[17.697%] w-[75.269%]">{children}</div>
    </div>
  );
}
