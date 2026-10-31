"use client";

// Sahayak, the legal helper: she tells it what happened, in her words and language; it explains which
// laws may apply and what she can do next, and can draft her complaint with her sealed evidence listed.
// The law cards and helplines come from our checked list (lib/law.ts), never from the model's text.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { digits, t, type StringKey } from "@/lib/i18n";
import { helplineById, lawById } from "@/lib/law";
import type { DeviceSetup, Language } from "@/lib/local";
import {
  askSahayak,
  draftComplaint,
  readAloud,
  SahayakError,
  sealedEvidence,
  type Answer,
  type Draft,
  type EvidenceLine,
  type Recipient,
  type Turn,
} from "@/lib/sahayak-client";
import { BackIcon, Button, RoundButton, Screen, Wordmark } from "./ui";

type Tr = (k: StringKey, v?: Record<string, string | number>) => string;

interface Exchange {
  question: string;
  answer: Answer | null; // null while waiting
  error: SahayakError["kind"] | null;
}

const SUGGESTIONS: StringKey[] = ["sahayakQ1", "sahayakQ2", "sahayakQ3", "sahayakQ4"];

// Speaking instead of typing uses the browser's own speech recognition: Chrome and Safari have it
// (prefixed), Firefox doesn't, and there the button simply isn't shown.
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
const SPEECH_LANG: Record<Language, string> = { en: "en-IN", bn: "bn-IN", hi: "hi-IN" };
function recognizer(): (new () => Recognition) | undefined {
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
const unchanging = () => () => {};

export function Sahayak({ setup, onBack }: { setup: DeviceSetup; onBack: () => void }) {
  const lang = setup.language;
  const tr: Tr = (k, v) => t(lang, k, v);
  const [thread, setThread] = useState<Exchange[]>([]);
  const [text, setText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [listening, setListening] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const canSpeak = useSyncExternalStore(unchanging, () => !!recognizer(), () => false);
  const end = useRef<HTMLDivElement>(null);
  const rec = useRef<Recognition | null>(null);
  const busy = thread.at(-1)?.answer === null && thread.at(-1)?.error === null;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread]);

  // Leaving Sahayak stops the microphone.
  useEffect(() => () => rec.current?.abort(), []);

  // One stretch of speech at a time: it stops when she pauses, and her words land in the box after
  // anything she has already typed, for her to check before sending.
  function listen() {
    if (rec.current) return rec.current.stop();
    const Rec = recognizer();
    if (!Rec) return;
    const r = new Rec();
    r.lang = SPEECH_LANG[lang];
    r.interimResults = true;
    const before = text.trim();
    r.onresult = (e) => {
      const said = Array.from(e.results, (res) => res[0].transcript).join("");
      setText(`${before ? `${before} ` : ""}${said}`.slice(0, 2000));
    };
    r.onerror = (e) => setMicBlocked(e.error === "not-allowed" || e.error === "service-not-allowed");
    r.onend = () => {
      rec.current = null;
      setListening(false);
    };
    rec.current = r;
    setMicBlocked(false);
    setListening(true);
    r.start();
  }

  // What the model sees: her questions and its own earlier answers.
  const turnsOf = (list: Exchange[]): Turn[] =>
    list.flatMap((x) => [
      { role: "user" as const, text: x.question },
      ...(x.answer ? [{ role: "model" as const, text: [x.answer.answer, ...x.answer.steps].join("\n") }] : []),
    ]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    rec.current?.abort();
    setText("");
    const next = [...thread.filter((x) => x.answer), { question, answer: null, error: null }];
    setThread(next);
    try {
      const answer = await askSahayak(lang, setup.ageGroup === "minor", turnsOf(next));
      setThread((th) => th.map((x, i) => (i === th.length - 1 ? { ...x, answer } : x)));
    } catch (e) {
      const kind = e instanceof SahayakError ? e.kind : "failed";
      setThread((th) => th.map((x, i) => (i === th.length - 1 ? { ...x, error: kind } : x)));
    }
  }

  if (drafting) return <Drafter setup={setup} turns={turnsOf(thread.filter((x) => x.answer))} onBack={() => setDrafting(false)} />;

  const answered = thread.some((x) => x.answer);

  return (
    <Screen>
      <header className="flex h-14 items-center justify-between">
        <RoundButton label={tr("back")} onClick={onBack}>
          <BackIcon />
        </RoundButton>
        <Wordmark />
        <span className="size-11" />
      </header>

      <section className="mt-5" lang={lang}>
        <p className="label">{tr("sahayak")}</p>
        <h1 className="mt-1.5 font-display text-[40px] leading-[1.05]">{tr("sahayakTitle")}</h1>
        <p className="mt-3 text-body-sm leading-relaxed text-muted">{tr("sahayakBody")}</p>
      </section>

      {thread.length === 0 && (
        <ul className="mt-6 flex flex-col gap-2" lang={lang}>
          {SUGGESTIONS.map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => void send(tr(k))}
                className="w-full rounded-2xl border border-hairline px-4 py-3.5 text-left text-body-sm leading-snug active:bg-blush"
              >
                {tr(k)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-5" lang={lang}>
        {thread.map((x, i) => (
          <div key={i} className="flex flex-col gap-3">
            <p className="ml-10 self-end whitespace-pre-wrap rounded-[20px] rounded-br-md bg-blush px-4 py-3 text-body-sm leading-relaxed">{x.question}</p>
            {x.answer ? (
              <AnswerCard answer={x.answer} lang={lang} tr={tr} />
            ) : x.error ? (
              <div className="rounded-[20px] border border-rani/30 bg-alert-bg p-4 text-body-sm leading-relaxed">
                <p>{tr(x.error === "limit" ? "sahayakLimit" : "sahayakFailed")}</p>
                {x.error !== "limit" && (
                  <button type="button" className="mt-2 font-medium text-rani" onClick={() => void send(x.question)}>
                    {tr("tryAgain")}
                  </button>
                )}
                {/* Even when the model can't answer, people can. */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {["h112", "h181", "h15100"].map((id) => {
                    const h = helplineById(id)!;
                    return (
                      <a key={id} href={`tel:${h.number}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rani/30 bg-white px-3.5 py-2 text-caption leading-tight">
                        <b className="font-medium text-rani">{h.number}</b>
                        <span>{h.name[lang]}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-hairline p-4">
                <p className="flex items-center gap-2 text-body-sm text-muted">
                  <i className="size-2 animate-pulse rounded-full bg-rani" />
                  {tr("sahayakThinking")}
                </p>
                <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-blush" />
                <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-blush" />
              </div>
            )}
          </div>
        ))}
        {answered && !busy && (
          <Button variant="ghost" onClick={() => setDrafting(true)}>
            {tr("draftComplaint")}
          </Button>
        )}
        <div ref={end} />
      </div>

      <p className="mt-6 text-caption leading-relaxed text-muted" lang={lang}>
        {tr("sahayakPrivacy")}
      </p>
      {micBlocked && (
        <p role="status" className="mt-3 text-caption leading-relaxed text-rani" lang={lang}>
          {tr("micBlocked")}
        </p>
      )}

      {/* However short the conversation, the box sits at the foot of the screen, as in any chat. */}
      <div className="min-h-4 flex-1" />
      <form
        className="sticky bottom-0 -mx-6 -mb-[max(env(safe-area-inset-bottom),24px)] flex items-end gap-2 border-t border-hairline bg-white/95 px-6 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        lang={lang}
      >
        <div className="relative flex min-w-0 flex-1">
          <textarea
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder={tr(listening ? "listening" : "sahayakPlaceholder")}
            aria-label={tr("sahayakPlaceholder")}
            className={`max-h-40 min-h-12 flex-1 resize-none rounded-3xl border border-hairline py-3 pl-4 text-body-sm leading-snug outline-none [field-sizing:content] focus:border-rani ${canSpeak ? "pr-12" : "pr-4"}`}
          />
          {canSpeak && (
            <button
              type="button"
              onClick={listen}
              aria-label={tr(listening ? "stopListening" : "speak")}
              aria-pressed={listening}
              className={`absolute bottom-1 right-1 flex size-10 items-center justify-center rounded-full ${listening ? "bg-rani text-white" : "text-muted active:bg-blush"}`}
            >
              {listening ? (
                <>
                  <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-rani/40" />
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="relative fill-current">
                    <rect width="12" height="12" rx="2.5" />
                  </svg>
                </>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-width:1.6]">
                  <rect x="6.5" y="1.8" width="5" height="9.4" rx="2.5" />
                  <path d="M3.6 8.6a5.4 5.4 0 0 0 10.8 0M9 14v2.4" />
                </svg>
              )}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label={tr("send")}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rani text-white disabled:bg-rani/40"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
            <path d="M9 15V3M4 8l5-5 5 5" />
          </svg>
        </button>
      </form>
    </Screen>
  );
}

function AnswerCard({ answer, lang, tr }: { answer: Answer; lang: Language; tr: Tr }) {
  return (
    <article className="rounded-[20px] border border-hairline p-4">
      {answer.urgent && (
        <a href="tel:112" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-rani px-4 py-3 text-white">
          <span className="text-body-sm font-medium leading-snug">{tr("sahayakUrgent")}</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-caption font-medium text-rani">112</span>
        </a>
      )}
      <p className="whitespace-pre-wrap text-body leading-relaxed">{answer.answer}</p>
      <ReadAloud lang={lang} tr={tr} text={[answer.answer, ...answer.steps].map((x) => endSentence(x, lang)).join(" ")} />

      {answer.steps.length > 0 && (
        <>
          <p className="label mt-5">{tr("sahayakSteps")}</p>
          <ol className="mt-2 space-y-2">
            {answer.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-body-sm leading-relaxed">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blush text-caption text-rani">{digits(lang, i + 1)}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {answer.laws.length > 0 && (
        <>
          <p className="label mt-5">{tr("sahayakLaws")}</p>
          <ul className="mt-2 divide-y divide-hairline rounded-2xl border border-hairline">
            {answer.laws.map((id) => {
              const law = lawById(id);
              if (!law) return null;
              return (
                <li key={id}>
                  <details className="group px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <span>
                        <span className="block text-body-sm font-medium leading-snug">{law.title[lang]}</span>
                        <span className="mt-0.5 block text-caption text-muted" lang="en">
                          {law.act} · {law.section}
                        </span>
                      </span>
                      <svg width="14" height="14" viewBox="0 0 16 16" className="mt-1 shrink-0 fill-none stroke-muted transition-transform group-open:rotate-90 [stroke-width:1.8]">
                        <path d="m6 3 5 5-5 5" />
                      </svg>
                    </summary>
                    <p className="mt-2 text-caption leading-relaxed text-ink/80" lang="en">
                      {law.summary}
                    </p>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {answer.helplines.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {answer.helplines.map((id) => {
            const h = helplineById(id);
            if (!h) return null;
            return (
              <a
                key={id}
                href={h.web ? h.number : `tel:${h.number}`}
                target={h.web ? "_blank" : undefined}
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline px-3.5 py-2 text-caption leading-tight active:bg-blush"
              >
                {!h.web && <b className="font-medium text-rani">{h.number}</b>}
                <span>{h.name[lang]}</span>
              </a>
            );
          })}
        </div>
      )}

      {answer.followUp && <p className="mt-4 text-body-sm italic leading-relaxed text-muted">{answer.followUp}</p>}

    </article>
  );
}

// Each step ends in a full stop (or a danda), so the voice pauses between them.
const endSentence = (x: string, lang: Language) => (/[.!?।]$/.test(x.trim()) ? x.trim() : `${x.trim()}${lang === "en" ? "." : "।"}`);

// One voice at a time: starting another answer stops the one playing.
let stopPlaying: (() => void) | null = null;

/** For a woman who would rather listen than read: the answer and its steps, in her language. */
function ReadAloud({ text, lang, tr }: { text: string; lang: Language; tr: Tr }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "failed">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      const a = audio.current;
      if (!a) return;
      a.pause();
      URL.revokeObjectURL(a.src);
    },
    [],
  );

  async function toggle() {
    if (state === "loading") return;
    if (state === "playing") {
      audio.current?.pause();
      setState("idle");
      return;
    }
    stopPlaying?.();
    try {
      if (!audio.current) {
        setState("loading");
        const a = new Audio(URL.createObjectURL(await readAloud(lang, text)));
        a.onended = () => setState("idle");
        audio.current = a;
      }
      audio.current.currentTime = 0;
      await audio.current.play();
      stopPlaying = () => {
        audio.current?.pause();
        setState("idle");
      };
      setState("playing");
    } catch {
      setState("failed");
    }
  }

  const label = { idle: "readAloud", loading: "readingLoading", playing: "stopReading", failed: "readFailed" } as const;
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={state === "playing"}
      className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-caption font-medium ${state === "playing" ? "border-rani bg-rani text-white" : "border-hairline text-ink active:bg-blush"}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.5]">
        {state === "playing" ? <path d="M5 4v8M11 4v8" /> : <path d="M2.5 6v4h2.5l3.5 3V3L5 6zM11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" />}
      </svg>
      {tr(label[state])}
    </button>
  );
}

const RECIPIENTS: { id: Recipient; label: StringKey; note: StringKey }[] = [
  { id: "police", label: "toPolice", note: "toPoliceNote" },
  { id: "protection", label: "toProtection", note: "toProtectionNote" },
  { id: "icc", label: "toIcc", note: "toIccNote" },
  { id: "platform", label: "toPlatform", note: "toPlatformNote" },
  { id: "cyber", label: "toCyber", note: "toCyberNote" },
];
const DRAFT_LANGS: { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "bn", label: "বাংলা" },
  { id: "hi", label: "हिन्दी" },
];

function Drafter({ setup, turns, onBack }: { setup: DeviceSetup; turns: Turn[]; onBack: () => void }) {
  const lang = setup.language;
  const tr: Tr = (k, v) => t(lang, k, v);
  const [recipient, setRecipient] = useState<Recipient>("police");
  const [draftLang, setDraftLang] = useState<Language>(lang);
  const [evidence, setEvidence] = useState<EvidenceLine[] | null>(null);
  const [include, setInclude] = useState(true);
  const [result, setResult] = useState<Draft | null>(null);
  const [error, setError] = useState<SahayakError["kind"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    sealedEvidence().then(setEvidence, () => setEvidence([]));
  }, []);

  const letter = result ? `${result.subject}\n\n${result.body}` : "";

  async function make() {
    setBusy(true);
    setError(null);
    try {
      setResult(await draftComplaint(draftLang, recipient, turns, include ? (evidence ?? []) : []));
    } catch (e) {
      setError(e instanceof SahayakError ? e.kind : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      if (navigator.share) return await navigator.share({ text: letter });
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // She closed the share sheet.
    }
  }

  return (
    <Screen>
      <header className="flex h-14 items-center justify-between">
        <RoundButton label={tr("back")} onClick={result ? () => setResult(null) : onBack}>
          <BackIcon />
        </RoundButton>
        <Wordmark />
        <span className="size-11" />
      </header>
      <section className="mt-5" lang={lang}>
        <p className="label">{tr("sahayak")}</p>
        <h1 className="mt-1.5 font-display text-[36px] leading-[1.05]">{tr("draftTitle")}</h1>
      </section>

      {result ? (
        <section className="mt-5 flex flex-1 flex-col" lang={draftLang}>
          <textarea
            value={letter}
            onChange={(e) => {
              const [subject, ...rest] = e.target.value.split("\n\n");
              setResult({ subject, body: rest.join("\n\n") });
            }}
            className="min-h-[50vh] flex-1 resize-none rounded-2xl border border-hairline p-4 text-body-sm leading-relaxed outline-none focus:border-rani"
          />
          <p className="mt-3 text-caption leading-relaxed text-muted" lang={lang}>
            {tr("draftCheck")}
          </p>
          <div className="mt-4 flex flex-col gap-2.5" lang={lang}>
            <Button onClick={() => void share()}>{copied ? tr("linkCopied") : tr("draftShare")}</Button>
            <Button variant="ghost" onClick={() => void make()} disabled={busy}>
              {tr("draftAgain")}
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-5 flex flex-col gap-5" lang={lang}>
          <div role="radiogroup" className="flex flex-col gap-2">
            {RECIPIENTS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={recipient === r.id}
                onClick={() => setRecipient(r.id)}
                className={`rounded-2xl border px-4 py-3 text-left ${recipient === r.id ? "border-rani bg-alert-bg/50" : "border-hairline"}`}
              >
                <span className="block text-body-sm font-medium">{tr(r.label)}</span>
                <span className="mt-0.5 block text-caption leading-snug text-muted">{tr(r.note)}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="label">{tr("draftLanguage")}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DRAFT_LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  lang={l.id}
                  aria-pressed={draftLang === l.id}
                  onClick={() => setDraftLang(l.id)}
                  className={`h-12 rounded-full border text-body-sm ${draftLang === l.id ? "border-rani bg-rani text-white" : "border-hairline"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-hairline p-4">
            <input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} className="mt-1 size-5 accent-rani" />
            <span className="text-body-sm leading-snug">
              {tr("draftEvidence", { n: digits(lang, evidence?.length ?? 0) })}
              <span className="mt-1 block text-caption text-muted">{tr("draftEvidenceNote")}</span>
            </span>
          </label>

          {error && <p className="text-body-sm text-rani">{tr(error === "limit" ? "sahayakLimit" : "sahayakFailed")}</p>}
          <Button onClick={() => void make()} disabled={busy || evidence === null}>
            {busy ? tr("draftWriting") : tr("draftMake")}
          </Button>
        </section>
      )}
    </Screen>
  );
}
