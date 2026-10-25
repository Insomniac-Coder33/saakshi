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

export function Screenshot({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width={393} height={852} className="size-full object-cover object-top" loading="lazy" />;
}
