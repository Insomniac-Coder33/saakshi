"use client";

import { useState } from "react";
import { LANGUAGES, t, type StringKey } from "@/lib/i18n";
import { changeDuressPin, changePin, checkPin, eraseEverything, updatePreferences } from "@/lib/setup";
import { Guardians } from "./Guardians";
import { BackIcon, Button, PinInput, RoundButton, Screen } from "./ui";
import type { VaultProps } from "./Vault";

type Panel = null | "pin" | "duress" | "erase";

export function Settings({ setup, privateKey, onSetupChange, onErased, onBack }: VaultProps & { onBack: () => void }) {
  const lang = setup.language;
  const tr = (k: StringKey) => t(lang, k);
  const [panel, setPanel] = useState<Panel>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<StringKey | null>(null);
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Panel>(null);

  function open(p: Panel) {
    setPanel(p);
    setA("");
    setB("");
    setError(null);
    setEraseError(null);
  }

  async function savePin() {
    if (a.length < 4) return setError("pinShort");
    if (a !== b) return setError("pinMismatch");
    setBusy(true);
    try {
      const clash = await checkPin(setup, a);
      if (panel === "pin" && clash.kind === "duress") return setError("duressSame");
      if (panel === "duress" && clash.kind === "vault") return setError("duressSame");
      onSetupChange(panel === "pin" ? await changePin(setup, privateKey, a) : await changeDuressPin(setup, a));
      setDone(panel);
      open(null);
    } catch {
      setError("offline");
    } finally {
      setBusy(false);
    }
  }

  async function erase() {
    setBusy(true);
    try {
      await eraseEverything();
      onErased();
    } catch (e) {
      setEraseError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <header className="flex h-14 items-center">
        <RoundButton label={tr("back")} onClick={onBack}>
          <BackIcon />
        </RoundButton>
      </header>
      <h1 className="mt-6 font-display text-h1" lang={lang}>
        {tr("settings")}
      </h1>

      <section className="mt-8" lang={lang}>
        <p className="label">{tr("language")}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              lang={l.id}
              aria-pressed={lang === l.id}
              onClick={async () => onSetupChange(await updatePreferences(setup, { language: l.id }))}
              className={`h-14 rounded-full border text-[16px] ${lang === l.id ? "border-rani bg-rani text-white" : "border-hairline"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <Guardians lang={lang} />

      <section className="mt-8 border-t border-hairline" lang={lang}>
        {(["pin", "duress"] as const).map((p) => (
          <div key={p} className="border-b border-hairline">
            <button type="button" onClick={() => open(panel === p ? null : p)} className="flex h-16 w-full items-center justify-between text-body">
              {tr(p === "pin" ? "changePin" : "changeDuress")}
              {done === p && <span className="text-caption text-muted">{tr("saved_")}</span>}
            </button>
            {panel === p && (
              <div className="flex flex-col gap-4 pb-5">
                <PinInput label={tr(p === "pin" ? "pinTitle" : "duressTitle")} value={a} onChange={setA} autoFocus />
                <PinInput label={tr("pinConfirm")} value={b} onChange={setB} />
                {error && <p role="alert" className="text-body-sm text-rani">{tr(error)}</p>}
                <Button disabled={busy} onClick={() => void savePin()}>
                  {tr("save")}
                </Button>
              </div>
            )}
          </div>
        ))}
        <div className="border-b border-hairline">
          <button type="button" onClick={() => open(panel === "erase" ? null : "erase")} className="flex h-16 w-full items-center text-body text-rani">
            {tr("eraseAll")}
          </button>
          {panel === "erase" && (
            <div className="flex flex-col gap-4 pb-5">
              <p className="text-body-sm leading-relaxed text-muted">{tr("eraseBody")}</p>
              <label className="block">
                <span className="label">{tr("eraseConfirm")}</span>
                <input
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  autoCapitalize="characters"
                  className="mt-2 h-14 w-full rounded-2xl border border-hairline px-5 text-lead outline-none focus:border-rani"
                />
              </label>
              {eraseError && <p role="alert" className="text-body-sm text-rani">{eraseError}</p>}
              <Button variant="danger" disabled={busy || a.trim().toUpperCase() !== "ERASE"} onClick={() => void erase()}>
                {tr("eraseAll")}
              </Button>
            </div>
          )}
        </div>
      </section>
    </Screen>
  );
}
