"use client";

// The seal, made something to touch. A journal line is fingerprinted in the visitor's own browser with
// the same SHA-256 Saakshi takes of every five-second piece. Change one letter and almost every
// character of the fingerprint changes, and the line no longer matches what was sealed.
import { useEffect, useState } from "react";

const SEALED = "Tue 28 Oct, 9:40 pm. He threw my phone at the wall. My sister saw it.";

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Fingerprint() {
  const [text, setText] = useState(SEALED);
  const [sealed, setSealed] = useState<string | null>(null);
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    void sha256(SEALED).then(setSealed);
  }, []);
  useEffect(() => {
    let live = true;
    void sha256(text).then((h) => live && setNow(h));
    return () => {
      live = false;
    };
  }, [text]);

  const same = !!sealed && now === sealed;
  const changed = sealed && now ? [...now].filter((c, i) => c !== sealed[i]).length : 0;

  return (
    <div className="grid gap-10 border-t border-white/15 pt-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
      <div>
        <label htmlFor="sealed-line" className="text-[15px] text-on-dark">
          A journal entry, as she sealed it. Change anything, even one letter.
        </label>
        <textarea
          id="sealed-line"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          rows={3}
          spellCheck={false}
          className="mt-4 w-full resize-none rounded-[20px] border border-white/15 bg-plum-night/60 p-5 font-display text-[24px] leading-[1.35] text-white outline-none transition-colors focus:border-rani-bright md:text-[28px]"
        />
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-on-dark-muted">
          <span>Its SHA-256 is worked out in your browser as you type.</span>
          {!same && sealed && (
            <button type="button" onClick={() => setText(SEALED)} className="font-medium text-white underline underline-offset-2">
              Put it back
            </button>
          )}
        </div>
      </div>

      <div aria-live="polite">
        <div className="flex items-baseline justify-between gap-4">
          <p className={`font-display text-[48px] leading-none md:text-[56px] ${same ? "text-[#7fd1ad]" : "text-rani-bright"}`}>
            {sealed && now ? (same ? "Untampered" : "Changed") : " "}
          </p>
          <p className="text-right text-[14px] text-on-dark-muted">
            {same ? "Matches the sealed fingerprint" : `${changed} of 64 characters differ`}
          </p>
        </div>
        {/* The fingerprint, 64 characters in four rows; those that no longer match the sealed one light up. */}
        <p className="mt-6 grid grid-cols-16 gap-x-1 gap-y-2 font-mono text-[15px] sm:text-[18px]" aria-label={`Fingerprint ${now ?? ""}`}>
          {[...(now ?? "0".repeat(64))].map((c, i) => {
            const off = sealed && now && c !== sealed[i];
            return (
              <span
                key={i}
                className={`text-center transition-colors duration-300 ${off ? "text-rani-bright" : same ? "text-[#7fd1ad]" : "text-on-dark"}`}
              >
                {c}
              </span>
            );
          })}
        </p>
        <p className="mt-6 text-[14px] leading-[1.6] text-on-dark-muted">
          Saakshi seals the fingerprint, never the words. Anyone holding the file can work it out again and compare: the same
          file always gives the same 64 characters, and any change gives different ones.
        </p>
      </div>
    </div>
  );
}
