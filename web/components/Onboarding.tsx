"use client";

// First run: language, name, age, PIN, duress PIN, permissions, then the app becomes a calculator.
import { useState } from "react";
import { LANGUAGES, t, type StringKey } from "@/lib/i18n";
import type { DeviceSetup, Language } from "@/lib/local";
import { createSetup } from "@/lib/setup";
import { BackIcon, Button, PinInput, RoundButton, Screen, Wordmark } from "./ui";

type Step = "welcome" | "name" | "age" | "pin" | "duress" | "perms" | "ready";
const ORDER: Step[] = ["welcome", "name", "age", "pin", "duress", "perms", "ready"];

type PermState = "idle" | "granted" | "denied";

export function Onboarding({ onDone }: { onDone: (setup: DeviceSetup) => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [lang, setLang] = useState<Language>("en");
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<"adult" | "minor">("adult");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [duress, setDuress] = useState("");
  const [duress2, setDuress2] = useState("");
  const [error, setError] = useState<StringKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<DeviceSetup | null>(null);
  const [media, setMedia] = useState<PermState>("idle");
  const [geo, setGeo] = useState<PermState>("idle");

  const tr = (k: StringKey) => t(lang, k);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const back = () => go(ORDER[Math.max(0, ORDER.indexOf(step) - 1)]);

  function checkPinPair(a: string, b: string): StringKey | null {
    if (a.length < 4) return "pinShort";
    if (a !== b) return "pinMismatch";
    return null;
  }

  async function finishKeys() {
    const e = checkPinPair(duress, duress2) ?? (duress === pin ? "duressSame" : null);
    if (e) return setError(e);
    setBusy(true);
    setError(null);
    try {
      setSetup(await createSetup({ name: name.trim(), language: lang, ageGroup, pin, duressPin: duress }));
      setPin("");
      setPin2("");
      setDuress("");
      setDuress2("");
      go("perms");
    } catch {
      setError("needsNetwork");
    } finally {
      setBusy(false);
    }
  }

  async function askMedia() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      s.getTracks().forEach((tr) => tr.stop());
      setMedia("granted");
    } catch {
      setMedia("denied");
    }
  }

  function askGeo() {
    navigator.geolocation.getCurrentPosition(
      () => setGeo("granted"),
      () => setGeo("denied"),
      { timeout: 15_000 },
    );
  }

  const progress = ORDER.indexOf(step);

  return (
    <Screen tone={step === "welcome" || step === "ready" ? "blush" : "white"}>
      <header className="flex h-14 items-center justify-between">
        {step !== "welcome" && step !== "perms" && step !== "ready" ? (
          <RoundButton label={tr("back")} onClick={back}>
            <BackIcon />
          </RoundButton>
        ) : (
          <Wordmark />
        )}
        <div className="flex gap-1.5" aria-hidden>
          {ORDER.slice(1).map((s, i) => (
            <i key={s} className={`h-1 w-5 rounded-full ${i < progress ? "bg-rani" : "bg-hairline"}`} />
          ))}
        </div>
      </header>

      <div key={step} className="flex flex-1 animate-rise flex-col" lang={lang}>
        {step === "welcome" && (
          <>
            <div className="mt-[12vh]">
              <img src="/brand/mark.svg" alt="" className="size-14" />
              <h1 className="mt-6 font-display text-h1 leading-[1.05]">{tr("welcomeTitle")}</h1>
              <p className="mt-4 text-body leading-relaxed text-muted">{tr("welcomeBody")}</p>
            </div>
            <div className="mt-auto">
              <p className="label">{tr("chooseLanguage")}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    lang={l.id}
                    onClick={() => setLang(l.id)}
                    aria-pressed={lang === l.id}
                    className={`h-14 rounded-full border text-[16px] ${lang === l.id ? "border-rani bg-rani text-white" : "border-blush-line bg-white"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <Button className="mt-4" onClick={() => go("name")}>
                {tr("continue")}
              </Button>
            </div>
          </>
        )}

        {step === "name" && (
          <Body title={tr("nameTitle")} body={tr("nameBody")}>
            <input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("namePlaceholder")}
              className="h-14 w-full rounded-2xl border border-hairline px-5 text-lead outline-none focus:border-rani"
            />
            <Button className="mt-auto" onClick={() => go("age")}>
              {tr("continue")}
            </Button>
          </Body>
        )}

        {step === "age" && (
          <Body title={tr("ageTitle")} body={tr("ageBody")}>
            <div className="mt-auto flex flex-col gap-3">
              <Button
                onClick={() => {
                  setAgeGroup("adult");
                  go("pin");
                }}
              >
                {tr("ageAdult")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAgeGroup("minor");
                  go("pin");
                }}
              >
                {tr("ageMinor")}
              </Button>
            </div>
          </Body>
        )}

        {step === "pin" && (
          <Body title={tr("pinTitle")} body={tr("pinBody")}>
            <div className="flex flex-col gap-5">
              <PinInput label={tr("pinTitle")} value={pin} onChange={setPin} autoFocus />
              <PinInput label={tr("pinConfirm")} value={pin2} onChange={setPin2} />
            </div>
            <ErrorLine error={error} lang={lang} />
            <Button
              className="mt-auto"
              disabled={pin.length < 4 || pin2.length < 4}
              onClick={() => {
                const e = checkPinPair(pin, pin2);
                if (e) setError(e);
                else go("duress");
              }}
            >
              {tr("continue")}
            </Button>
          </Body>
        )}

        {step === "duress" && (
          <Body title={tr("duressTitle")} body={tr("duressBody")}>
            <div className="flex flex-col gap-5">
              <PinInput label={tr("duressTitle")} value={duress} onChange={setDuress} autoFocus />
              <PinInput label={tr("pinConfirm")} value={duress2} onChange={setDuress2} />
            </div>
            <ErrorLine error={error} lang={lang} />
            <Button
              className="mt-auto"
              disabled={busy || duress.length < 4 || duress2.length < 4}
              onClick={() => void finishKeys()}
            >
              {busy ? tr("settingUp") : tr("continue")}
            </Button>
          </Body>
        )}

        {step === "perms" && (
          <Body title={tr("permsTitle")} body={tr("permsBody")}>
            <div className="border-t border-hairline">
              <PermRow label={tr("permCamera")} state={media} onAsk={() => void askMedia()} lang={lang} />
              <PermRow label={tr("permLocation")} state={geo} onAsk={askGeo} lang={lang} />
            </div>
            <Button className="mt-auto" onClick={() => go("ready")}>
              {media === "idle" && geo === "idle" ? tr("skip") : tr("continue")}
            </Button>
          </Body>
        )}

        {step === "ready" && setup && (
          <>
            <div className="mt-[10vh]">
              <img src="/icons/calculator-192.png" alt="" className="size-16 rounded-[18px]" />
              <h1 className="mt-6 font-display text-h1 leading-[1.05]">{tr("readyTitle")}</h1>
              <ol className="mt-6 flex flex-col gap-4 text-body">
                <li className="border-t border-blush-line pt-4">{tr("readyPin")}</li>
                <li className="border-t border-blush-line pt-4">{tr("readyTap")}</li>
                <li className="border-t border-blush-line pt-4 text-muted">{tr("readyInstall")}</li>
              </ol>
            </div>
            <Button className="mt-auto" onClick={() => onDone(setup)}>
              {tr("openCalculator")}
            </Button>
          </>
        )}
      </div>
    </Screen>
  );
}

function Body({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="mt-8 font-display text-[40px] leading-[1.05]">{title}</h1>
      <p className="mb-8 mt-3 text-body leading-relaxed text-muted">{body}</p>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}

function ErrorLine({ error, lang }: { error: StringKey | null; lang: Language }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-4 text-body-sm text-rani">
      {t(lang, error)}
    </p>
  );
}

function PermRow({ label, state, onAsk, lang }: { label: string; state: PermState; onAsk: () => void; lang: Language }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 border-b border-hairline py-3">
      <span className="text-body">{label}</span>
      {state === "idle" ? (
        <button type="button" onClick={onAsk} className="h-11 rounded-full bg-rani px-5 text-[15px] font-medium text-white">
          {t(lang, "allow")}
        </button>
      ) : (
        <span className={`text-body-sm ${state === "granted" ? "text-ink" : "text-muted"}`}>
          {t(lang, state === "granted" ? "allowed" : "blocked")}
        </span>
      )}
    </div>
  );
}
