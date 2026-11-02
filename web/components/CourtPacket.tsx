"use client";

// Everything she takes to the police station, Protection Officer or committee, as one document to
// print or save as PDF: her complaint as she finished it, the Section 63 certificate with a hash
// report for every sealed item it lists, and where to get free help. The complaint is in the
// language she chose; the certificate is in English, as the Schedule sets it out.
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { helplineById, lawById } from "@/lib/law";
import type { Language } from "@/lib/local";
import { listPieces, type PieceInfo } from "@/lib/recordings";
import type { SealedItem } from "@/lib/sahayak-client";
import type { Tongue } from "@/lib/tongues";
import { CertificatePaper, PAPER, usePaper, type CertItem } from "./Certificate";
import { BackIcon, Button, RoundButton } from "./ui";

const KIND = { recording: "Recording", photo: "Photo", journal: "Journal entry" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

// For her, after the papers: the routes the law gives her, from our checked list (lib/law.ts).
const HELP_LAWS = ["bnss173", "bnss175", "dv12", "bsa63"];
const HELP_LINES = ["h15100", "h181", "h112", "h1930", "hncw"];

/** The pieces each sealed file is made of, read from her seal records. */
async function certItems(items: SealedItem[]): Promise<CertItem[]> {
  const sessions = [...new Set(items.map((i) => i.sessionId))];
  const pieces = new Map(await Promise.all(sessions.map(async (id) => [id, await listPieces(id)] as const)));
  return items.map((i) => {
    const all = pieces.get(i.sessionId) ?? [];
    const own: PieceInfo[] =
      i.kind === "recording"
        ? all.filter((p) => p.kind === "media" && p.segment === i.segment)
        : all.filter((p) => p.kind === (i.kind === "photo" ? "image" : "text"));
    return { label: `${KIND[i.kind]}, ${when(i.at)} IST`, fileName: i.fileName, sha256: i.sha256, bytes: i.bytes, pieces: own, verifyUrl: i.verifyUrl };
  });
}

export function CourtPacket({
  lang,
  letterLang,
  letter,
  userId,
  evidence,
  onBack,
}: {
  lang: Language;
  letterLang: Tongue;
  letter: string;
  userId: string;
  evidence: SealedItem[];
  onBack: () => void;
}) {
  const tr = (k: Parameters<typeof t>[1]) => t(lang, k);
  const [items, setItems] = useState<CertItem[] | null>(evidence.length ? null : []);
  usePaper();
  const prepared = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" });

  useEffect(() => {
    if (!evidence.length) return;
    let live = true;
    certItems(evidence).then(
      (c) => live && setItems(c),
      () => live && setItems([]),
    );
    return () => {
      live = false;
    };
  }, [evidence]);

  const contents = [
    "The complaint, to be completed and signed",
    ...(items?.length ? [`Certificate under Section 63(4)(c), Bharatiya Sakshya Adhiniyam, 2023, with a hash report for ${items.length} sealed item${items.length > 1 ? "s" : ""}`] : []),
    "Free legal help",
  ];

  return (
    <main className="min-h-dvh bg-blush print:bg-white">
      <header className="sticky top-0 z-10 mx-auto flex max-w-[860px] items-center gap-3 bg-blush/95 px-4 py-3 backdrop-blur print:hidden" lang={lang}>
        <RoundButton label={tr("back")} onClick={onBack}>
          <BackIcon />
        </RoundButton>
        <p className="flex-1 text-body-sm leading-snug text-muted">{tr("packetIntro")}</p>
      </header>

      <article className={PAPER}>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Prepared {prepared} IST</p>
        <h1 className="mt-2 font-display text-[34px] leading-tight">Complaint and evidence</h1>
        <ol className="mt-4 list-decimal space-y-1 pl-5">
          {contents.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
        <p className="mt-4 text-muted">
          Each sealed item can be checked by anyone, without trusting Saakshi: see “How to check” in the hash report. Hand the files in
          with this paper; the paper lists them, and the files are the evidence.
        </p>

        <section className="mt-10 border-t border-hairline pt-8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">1 · Complaint</p>
          <div lang={letterLang} className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.75]">
            {letter}
          </div>
        </section>

        {items === null ? (
          <p className="mt-10 animate-pulse text-muted print:hidden">Reading your seal records…</p>
        ) : (
          items.length > 0 && (
            <section className="mt-12 break-before-page">
              <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-muted">2 · Evidence certificate</p>
              <CertificatePaper userId={userId} items={items} />
            </section>
          )
        )}

        <section className="mt-12 break-before-page" lang={lang}>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted" lang="en">
            {items?.length ? 3 : 2} · Free legal help
          </p>
          <h2 className="mt-2 font-display text-[26px] leading-tight">{tr("packetHelpTitle")}</h2>
          <p className="mt-2 text-muted">{tr("packetHelpBody")}</p>
          <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {HELP_LINES.map((id) => {
              const h = helplineById(id)!;
              return (
                <li key={id} className="flex items-baseline gap-3 border-t border-hairline pt-2">
                  <b className="w-[6.5rem] shrink-0 font-display text-[22px] font-normal text-rani" lang="en">
                    {h.number}
                  </b>
                  <span>{h.name[lang]}</span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-6">
            {HELP_LAWS.map((id) => {
              const law = lawById(id)!;
              return (
                <div key={id} className="break-inside-avoid border-t border-hairline py-3">
                  <dt className="font-medium">
                    {law.title[lang]} <span className="font-normal text-muted" lang="en">· {law.act} {law.section}</span>
                  </dt>
                  <dd className="mt-1 text-ink/80" lang="en">
                    {law.summary}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-6 border-t border-hairline pt-4 text-[11px] leading-relaxed text-muted" lang="en">
            Drafted with the Saakshi app from what she told it. It is information, not legal advice. Read it, correct anything that is
            wrong and sign it yourself.
          </p>
        </section>
      </article>

      <div className="mx-auto max-w-[860px] px-4 py-5 print:hidden" lang={lang}>
        <Button onClick={() => window.print()} disabled={items === null}>
          {tr("certPrint")}
        </Button>
      </div>
    </main>
  );
}
