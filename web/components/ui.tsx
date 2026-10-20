"use client";

// Shared pieces of the light Saakshi screens. Type and hairlines do the work; rani is the only accent.
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-rani text-white active:bg-rani-deep disabled:bg-rani/40",
  ghost: "border border-[#e4cbd6] bg-white text-ink active:bg-blush disabled:text-muted",
  danger: "border border-rani/40 bg-white text-rani active:bg-alert-bg",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-medium transition-colors duration-150 ${VARIANT[variant]} ${className}`}
    />
  );
}

export function Screen({ children, tone = "white" }: { children: ReactNode; tone?: "white" | "blush" }) {
  return (
    <main
      className={`mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),16px)] text-ink ${tone === "blush" ? "bg-blush" : "bg-white"}`}
    >
      {children}
    </main>
  );
}

export function Wordmark({ className = "h-[22px]" }: { className?: string }) {
  return <img src="/brand/wordmark-on-light.svg" alt="Saakshi" className={className} />;
}

export function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-hairline bg-white [&_svg]:fill-none [&_svg]:stroke-ink [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round] [&_svg]:[stroke-width:1.8]"
    >
      {children}
    </button>
  );
}

export const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M10 3 5 8l5 5" />
  </svg>
);

export const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="3" y="7" width="10" height="7" rx="1.6" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </svg>
);

export function PinInput({
  value,
  onChange,
  label,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={8}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
        className="mt-2 h-14 w-full rounded-2xl border border-hairline bg-white px-5 text-[24px] tracking-[0.4em] outline-none focus:border-rani"
      />
    </label>
  );
}
