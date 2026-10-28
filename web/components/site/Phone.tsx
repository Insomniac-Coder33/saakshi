// A phone, drawn in CSS, for real screenshots and the live app. Screens are 393 × 852 CSS pixels.
import type { ReactNode } from "react";

export function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative aspect-[393/852] rounded-[46px] bg-[#140a11] p-[9px] shadow-[0_60px_120px_-40px_rgba(214,36,110,.35),0_30px_60px_-30px_rgba(0,0,0,.8)] ring-1 ring-white/12 ${className}`}
    >
      <span aria-hidden className="absolute -left-[3px] top-[22%] h-12 w-[3px] rounded-l bg-[#2a1622]" />
      <span aria-hidden className="absolute -right-[3px] top-[28%] h-20 w-[3px] rounded-r bg-[#2a1622]" />
      <div className="relative size-full overflow-hidden rounded-[38px] bg-black">{children}</div>
    </div>
  );
}

/**
 * A real screenshot on the phone. Long screens carry on below the glass, so the bottom fades out the way
 * a scrolling screen does, under the gesture bar, instead of slicing a row of text in half. Screens that
 * end on the glass, like the calculator, pass `fade={false}` so their last row stays whole.
 */
export function Screenshot({
  src,
  alt,
  tone,
  fade = true,
  eager = false,
}: {
  src: string;
  alt: string;
  tone: "light" | "dark";
  fade?: boolean;
  eager?: boolean;
}) {
  const light = tone === "light";
  return (
    <>
      <img src={src} alt={alt} width={393} height={852} className="size-full object-cover object-top" loading={eager ? "eager" : "lazy"} />
      {fade && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-[13%] bg-gradient-to-t ${light ? "from-white via-white/85" : "from-black via-black/80"} to-transparent`}
        />
      )}
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-[1.6%] left-1/2 h-[4px] w-[34%] -translate-x-1/2 rounded-full ${light ? "bg-ink/75" : "bg-white/55"}`}
      />
    </>
  );
}
