"use client";

// First run: language, name, age, PIN, duress PIN, permissions, then the app becomes a calculator.
// Or, for a woman moving from another phone: a code her guardians approve, her PIN, a new duress PIN.
import { useEffect, useRef, useState } from "react";
import { digits, LANGUAGES, t, type StringKey } from "@/lib/i18n";
import type { DeviceSetup, Language } from "@/lib/local";
import { completeRecovery, ownProfile, recoveryStatus, startRecovery, type RecoveryRequest, type RecoveryStatus, type RemoteProfile } from "@/lib/recover";
import { createSetup, opensWith, restoreSetup } from "@/lib/setup";
import { OpeningEye } from "./site/OpeningEye";
import { BackIcon, Button, PinInput, RoundButton, Screen, Wordmark } from "./ui";

type Step = "welcome" | "name" | "age" | "pin" | "duress" | "perms" | "ready" | "recover" | "code" | "recoverPin";
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
  const [request, setRequest] = useState<RecoveryRequest | null>(null);
  const [recStatus, setRecStatus] = useState<RecoveryStatus | null>(null);
  const [profile, setProfile] = useState<RemoteProfile | null>(null);
  const [resumed, setResumed] = useState(false);
  const polling = useRef(false);

  const tr = (k: StringKey, vars?: Record<string, string | number>) => t(lang, k, vars);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const back = () => {
    if (step === "recover") return go("welcome");
    if (step === "code") return go("recover");
    if (step === "duress" && profile) return go("recoverPin");
    go(ORDER[Math.max(0, ORDER.indexOf(step) - 1)]);
  };

  async function getCode() {
    setBusy(true);
    setError(null);
    try {
      setRequest(await startRecovery());
      setRecStatus(null);
      go("code");
    } catch {
      setError("needsNetwork");
    } finally {
      setBusy(false);
    }
  }

  // While the code is up, ask every few seconds whether her guardians have approved; once they have,
  // this phone signs in to her account and asks for her PIN.
  useEffect(() => {
    if (step !== "code" || !request) return;
    let stopped = false;
    const tick = async () => {
      if (polling.current || stopped) return;
      polling.current = true;
      try {
        const s = await recoveryStatus(request.id);
        if (stopped) return;
        setRecStatus(s);
        if (s.status === "approved" || s.status === "claimed") {
          stopped = true;
          setBusy(true);
          const p = await completeRecovery(request.id);
          setProfile(p);
          setLang(p.language);
          setName(p.name);
          setAgeGroup(p.ageGroup);
          setBusy(false);
          go("recoverPin");
        }
      } catch {
        setBusy(false);
        stopped = false;
        setError("recoverFailed");
      } finally {
        polling.current = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [step, request]);

  // Already signed in to an account that has a Saakshi, with nothing on this phone: only her PIN is needed.
  useEffect(() => {
    let live = true;
    void ownProfile()
      .then((p) => {
        if (!live || !p) return;
        setProfile(p);
        setLang(p.language);
        setName(p.name);
        setAgeGroup(p.ageGroup);
        setResumed(true);
        setStep("recoverPin");
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function checkOldPin() {
    if (!profile) return;
    setBusy(true);
    const ok = await opensWith(profile, pin);
    setBusy(false);
    if (ok) go("duress");
    else setError("recoverPinWrong");
  }

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
      setSetup(
        profile ? await restoreSetup(profile, duress) : await createSetup({ name: name.trim(), language: lang, ageGroup, pin, duressPin: duress }),
      );
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
  // Setup opens and closes in the dark, like the SOS screen and the showcase; the questions between are light.
  const night = step === "welcome" || step === "ready";

  return (
    <Screen tone={night ? "night" : "white"}>
      {night && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="opening-light absolute -top-40 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(214_36_110/0.32),transparent)]" />
          <div className="grain absolute inset-0" />
        </div>
      )}
      <header className={`relative flex h-14 items-center ${night ? "justify-center" : "justify-between"}`}>
        {night ? (
          <Wordmark dark className="h-[22px] opacity-90" />
        ) : step !== "perms" && step !== "recoverPin" ? (
          <RoundButton label={tr("back")} onClick={back}>
            <BackIcon />
          </RoundButton>
        ) : (
          <Wordmark />
        )}
        {!night && (
          <div className={`flex gap-1.5 ${progress < 0 ? "invisible" : ""}`} aria-hidden>
            {ORDER.slice(1, -1).map((s, i) => (
              <i key={s} className={`h-1 w-5 rounded-full transition-colors ${i < progress ? "bg-rani" : "bg-hairline"}`} />
            ))}
          </div>
        )}
      </header>

      <div key={step} className={`relative flex flex-1 flex-col ${night ? "" : "animate-rise"}`} lang={lang}>
        {step === "welcome" && (
          <>
            {/* A title card: the third eye opens (as on the showcase), then the promise, then the choice. */}
            <div className="mt-[9vh] flex flex-col items-center text-center">
              <OpeningEye className="size-[76px]" />
              <h1 className="opening mt-9 font-display text-[44px] leading-[1.02] [animation-delay:1.6s]">{tr("welcomeTitle")}</h1>
              <p className="opening mt-5 max-w-[21rem] text-body leading-relaxed text-on-dark [animation-delay:1.8s]">{tr("welcomeBody")}</p>
            </div>
            <div className="opening mt-auto pt-10 [animation-delay:2s]">
              <p className="label text-center text-rani-bright!">{tr("chooseLanguage")}</p>
              <div role="radiogroup" aria-label={tr("chooseLanguage")} className="mt-3 grid grid-cols-3 rounded-full bg-white/[0.07] p-1 ring-1 ring-white/10">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    lang={l.id}
                    onClick={() => setLang(l.id)}
                    aria-checked={lang === l.id}
                    className={`h-12 rounded-full text-[16px] transition-colors duration-200 ${lang === l.id ? "bg-white font-medium text-ink" : "text-on-dark active:bg-white/10"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <Button className="mt-5" onClick={() => go("name")}>
                {tr("continue")}
              </Button>
              <button type="button" onClick={() => go("recover")} className="mt-2 h-12 w-full text-[15px] text-on-dark-muted underline underline-offset-4">
                {tr("moveLink")}
              </button>
            </div>
          </>
        )}

        {step === "recover" && (
          <Body title={tr("recoverTitle")} body={tr("recoverBody")}>
            <p className="text-body-sm leading-relaxed text-muted">{tr("recoverNoGuardians")}</p>
            <ErrorLine error={error} lang={lang} />
            <div className="mt-auto flex flex-col gap-3">
              <Button disabled={busy} onClick={() => void getCode()}>
                {tr("recoverStart")}
              </Button>
              <Button variant="ghost" onClick={() => go("name")}>
                {tr("recoverSetUpNew")}
              </Button>
            </div>
          </Body>
        )}

        {step === "code" && request && (
          <Body title={tr("codeTitle")} body={tr("codeBody")}>
            {/* Western digits even in Bengali: her guardians type them into Telegram. */}
            <p className="font-display text-[64px] leading-none tracking-[.06em] [font-variant-numeric:tabular-nums]" lang="en">
              {request.code.slice(0, 3)} {request.code.slice(3)}
            </p>
            <p role="status" className="mt-6 text-body leading-relaxed text-muted">
              {busy
                ? tr("recoverOpening")
                : recStatus?.status === "declined"
                  ? tr("codeDeclined")
                  : recStatus?.status === "expired"
                    ? tr("codeExpired")
                    : recStatus?.needed && recStatus.approvals > 0
                      ? tr("codeProgress", { n: digits(lang, recStatus.approvals), total: digits(lang, recStatus.needed) })
                      : tr("codeWaiting")}
            </p>
            <ErrorLine error={error} lang={lang} />
            {(recStatus?.status === "declined" || recStatus?.status === "expired") && (
              <Button className="mt-auto" disabled={busy} onClick={() => void getCode()}>
                {tr("codeNew")}
              </Button>
            )}
          </Body>
        )}

        {step === "recoverPin" && (
          <Body title={tr("recoverPinTitle")} body={tr(resumed ? "resumePinBody" : "recoverPinBody")}>
            <PinInput label={tr("recoverPinTitle")} value={pin} onChange={setPin} autoFocus />
            <ErrorLine error={error} lang={lang} />
            <Button className="mt-auto" disabled={busy || pin.length < 4} onClick={() => void checkOldPin()}>
              {tr("continue")}
            </Button>
          </Body>
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
            {/* The last thing she sees as Saakshi: what it will look like from now on, and how to get back in. */}
            <div className="mt-[8vh] flex flex-col items-center text-center">
              <img src="/icons/calculator-192.png" alt="" className="opening size-[76px] rounded-[22px] shadow-[0_20px_60px_-12px_rgb(214_36_110/0.45)] ring-1 ring-white/10" />
              <h1 className="opening mt-8 font-display text-[44px] leading-[1.02] [animation-delay:0.15s]">{tr("readyTitle")}</h1>
            </div>
            <ol className="mt-9 flex flex-col text-body text-on-dark">
              {(["readyPin", "readyTap", "readyInstall"] as const).map((k, i) => (
                <li key={k} className={`opening flex gap-4 border-t border-white/12 py-4 ${k === "readyInstall" ? "text-on-dark-muted" : ""}`} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
                  <span className="w-5 flex-none font-display text-[20px] leading-6 text-rani-bright">{digits(lang, i + 1)}</span>
                  <span>{tr(k)}</span>
                </li>
              ))}
            </ol>
            <Button className="opening mt-auto [animation-delay:0.7s]" onClick={() => onDone(setup)}>
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
