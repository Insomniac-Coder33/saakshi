"use client";

// The disguise. A fully working calculator; her PIN and = opens Saakshi, and three taps on the
// display start a silent SOS. Nothing on this screen names Saakshi.
import { useRef, useState } from "react";
import { displayExpr, initialCalc, looksLikePin, press, type CalcState } from "@/lib/calc";

const KEYS: { k: string; cls: string }[] = [
  { k: "AC", cls: "fn" },
  { k: "±", cls: "fn" },
  { k: "%", cls: "fn" },
  { k: "÷", cls: "op" },
  { k: "7", cls: "" },
  { k: "8", cls: "" },
  { k: "9", cls: "" },
  { k: "×", cls: "op" },
  { k: "4", cls: "" },
  { k: "5", cls: "" },
  { k: "6", cls: "" },
  { k: "−", cls: "op" },
  { k: "1", cls: "" },
  { k: "2", cls: "" },
  { k: "3", cls: "" },
  { k: "+", cls: "op" },
  { k: "0", cls: "zero" },
  { k: ".", cls: "" },
  { k: "=", cls: "eq" },
];

const KEY_STYLE: Record<string, string> = {
  "": "bg-calc-key text-[30px]",
  fn: "bg-calc-fn text-[24px]",
  op: "bg-calc-op text-calc-op-text text-[34px]",
  eq: "bg-rani text-[34px]",
  zero: "bg-calc-key text-[30px] col-span-2 aspect-auto! justify-start! pl-[30px]",
};

export interface CalculatorProps {
  /** Called on = when the expression is 4 to 8 digits. Return true if it opened something. */
  onPin: (pin: string) => Promise<boolean>;
  onTripleTap: () => void;
}

export function Calculator({ onPin, onTripleTap }: CalculatorProps) {
  const [state, setState] = useState<CalcState>(initialCalc);
  const [busy, setBusy] = useState(false);
  const taps = useRef<number[]>([]);
  // The raw digits since the last non-digit key. The calculator itself collapses "0000" to "0",
  // so PINs are matched against what she actually pressed.
  const digitsTyped = useRef("");

  async function onKey(k: string) {
    if (busy) return;
    const typed = digitsTyped.current;
    digitsTyped.current = /^\d$/.test(k) ? (state.result !== null ? k : typed + k) : "";
    if (k === "=" && state.result === null && /^\d+$/.test(state.expr) && looksLikePin(typed)) {
      setBusy(true);
      try {
        if (await onPin(typed)) {
          setState(initialCalc);
          return;
        }
      } finally {
        setBusy(false);
      }
    }
    setState((s) => press(s, k));
  }

  function onDisplayTap() {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 1200), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      onTripleTap();
    }
  }

  const shown = state.result ?? (displayExpr(state.expr) || "0");
  const size = shown.length > 12 ? "text-[44px]" : shown.length > 9 ? "text-[60px]" : shown.length > 6 ? "text-[76px]" : "text-[96px]";

  return (
    <main className="mx-auto flex h-(--app-h) max-w-[480px] flex-col bg-calc text-white select-none">
      <div
        role="presentation"
        onPointerDown={onDisplayTap}
        className="flex min-h-0 flex-1 flex-col items-end justify-end overflow-hidden px-8 pb-6 pt-[max(env(safe-area-inset-top),24px)]"
      >
        <div className="mb-1 h-7 text-[22px] text-[#8c8189]">{state.result !== null ? displayExpr(state.history) : ""}</div>
        <output aria-live="polite" className={`${size} max-w-full truncate leading-none tracking-[-0.035em]`}>
          {shown}
        </output>
      </div>
      <div className="grid grid-cols-4 gap-[13px] px-[25px] pb-[max(env(safe-area-inset-bottom),28px)]">
        {KEYS.map(({ k, cls }) => (
          <button
            key={k}
            type="button"
            aria-label={k === "−" ? "minus" : k === "×" ? "times" : k === "÷" ? "divide" : k}
            onClick={() => void onKey(k)}
            className={`flex aspect-square items-center justify-center rounded-full transition-[filter] duration-150 active:brightness-150 ${KEY_STYLE[cls]}`}
          >
            {k}
          </button>
        ))}
      </div>
    </main>
  );
}
