"use client";

// The certificate a court asks for with any electronic record: Section 63(4)(c) of the Bharatiya
// Sakshya Adhiniyam, 2023, in the form set out in its Schedule. Part A is filled in from Saakshi's
// own sealing records (the hashes, the device, the Polygon transactions) and from a hash report
// with a verify code for each file. She reads it, completes the blanks and signs it herself.
// Printing it (or "Save as PDF") prints only the paper, never the app around it.
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ANCHOR_ADDRESS, CHAIN_NAME, txUrl } from "@/lib/chain";
import { t, type StringKey } from "@/lib/i18n";
import type { Language } from "@/lib/local";
import type { PieceInfo } from "@/lib/recordings";
import { BackIcon, Button, RoundButton } from "./ui";

export interface CertItem {
  label: string; // "Recording, part 1", "Photo", "Journal entry"
  fileName: string; // as she downloads it
  sha256: string; // of that file, byte for byte
  bytes: number;
  pieces: PieceInfo[]; // the sealed pieces it is made of
  verifyUrl: string;
}

const IST = "Asia/Kolkata";
const istTime = (iso: string | null) =>
  iso ? `${new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium", timeZone: IST })} IST` : "—";

interface UADataValues {
  model?: string;
  platform?: string;
  platformVersion?: string;
}

/** What this browser can say about the phone. Chrome on Android reports the model; others don't. */
async function deviceInfo(): Promise<{ model: string; system: string }> {
  const ua = navigator.userAgent;
  const data = (navigator as Navigator & { userAgentData?: { getHighEntropyValues(h: string[]): Promise<UADataValues> } }).userAgentData;
  let model = "";
  let system = "";
  try {
    const v = await data?.getHighEntropyValues(["model", "platform", "platformVersion"]);
    model = v?.model ?? "";
    const major = Number(v?.platformVersion?.split(".")[0] ?? 0);
    // Windows reports its own build numbering: 13 and above is Windows 11.
    if (v?.platform === "Windows") system = major >= 13 ? "Windows 11" : "Windows 10";
    else if (v?.platform) system = `${v.platform}${major ? ` ${major}` : ""}`;
  } catch {
    // Not offered; fall back to the user-agent string.
  }
  if (!system) system = /Android [\d.]+/.exec(ua)?.[0] ?? (/iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : "");
  const browser =
    /Edg\/(\d+)/.exec(ua)?.[0].replace("Edg/", "Edge ") ??
    /Chrome\/(\d+)/.exec(ua)?.[0].replace("/", " ") ??
    (/Version\/\d+.*Safari/.test(ua) ? "Safari" : "");
  return { model, system: [system, browser].filter(Boolean).join(" · ") };
}

export function Certificate({
  lang,
  userId,
  items,
  onBack,
}: {
  lang: Language;
  userId: string;
  items: CertItem[];
  onBack: () => void;
}) {
  const tr = (k: StringKey) => t(lang, k);
  const [device, setDevice] = useState<{ model: string; system: string } | null>(null);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const prepared = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: IST });

  useEffect(() => {
    let live = true;
    deviceInfo().then((d) => live && setDevice(d), () => {});
    Promise.all(
      items.map(async (i) => [i.sha256, await QRCode.toString(i.verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" })] as const),
    ).then((pairs) => live && setQrs(Object.fromEntries(pairs)), () => {});
    return () => {
      live = false;
    };
  }, [items]);

  return (
    <main className="min-h-dvh bg-blush print:bg-white">
      <header className="sticky top-0 z-10 mx-auto flex max-w-[860px] items-center gap-3 bg-blush/95 px-4 py-3 backdrop-blur print:hidden" lang={lang}>
        <RoundButton label={tr("back")} onClick={onBack}>
          <BackIcon />
        </RoundButton>
        <p className="flex-1 text-body-sm leading-snug text-muted">{tr("certIntro")}</p>
      </header>

      <article className="mx-auto max-w-[860px] bg-white px-6 py-10 text-[13px] leading-[1.6] text-ink shadow-card md:px-14 print:max-w-none print:p-0 print:shadow-none">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Schedule · Bharatiya Sakshya Adhiniyam, 2023</p>
        <h1 className="mt-2 font-display text-[30px] leading-tight">Certificate under Section 63(4)(c)</h1>
        <p className="mt-1 text-[15px] font-medium">Part A · To be filled by the party</p>

        <p className="mt-6">
          I, <Blank w="14rem" />, daughter / son / spouse of <Blank w="12rem" />, residing at / employed at <Blank w="20rem" />, do hereby
          solemnly affirm and sincerely state and submit as follows:
        </p>
        <ol className="mt-4 list-decimal space-y-4 pl-5">
          <li>
            I have produced the electronic record(s) listed in the hash report below, taken from the following device / digital record
            source:
            <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {["Computer / storage media", "DVR", "Mobile", "Flash drive", "CD / DVD", "Server", "Cloud", "Other"].map((s) => (
                <Box key={s} checked={s === "Mobile" || s === "Cloud"} label={s} />
              ))}
            </span>
            <span className="mt-3 grid gap-1 sm:grid-cols-2">
              <Field k="Make & model" v={device?.model || null} />
              <Field k="Operating system · browser" v={device?.system || null} />
              <Field k="Serial number" v={null} />
              <Field k="IMEI / UIN / UID / MAC" v={null} />
              <Field k="Cloud ID" v={`Saakshi encrypted evidence store, account ${userId}`} wide />
            </span>
          </li>
          <li>
            The digital device or the digital record source was under lawful control for regularly creating, storing or processing
            information for the purposes of carrying out regular activities, and during this period it was working properly and the
            relevant information was regularly fed into it in the ordinary course. If at any point it was not working properly or was out of
            operation, that has not affected the electronic record or its accuracy.
          </li>
          <li>
            The digital device or the source of the digital record is:
            <span className="mt-2 flex flex-wrap gap-x-5">
              {["Owned", "Maintained", "Managed", "Operated"].map((s) => (
                <Box key={s} label={s} />
              ))}
              <span>by me (tick as applicable).</span>
            </span>
          </li>
          <li>
            I state that the hash value(s) of the electronic record(s) are as set out in the enclosed hash report, obtained through the
            following algorithm:
            <span className="mt-2 flex flex-wrap gap-x-5">
              <Box label="SHA1" />
              <Box checked label="SHA256" />
              <Box label="MD5" />
              <Box label="Other" />
            </span>
          </li>
        </ol>

        <Signature who="Name and signature" />

        <section className="mt-10 break-before-page">
          <h2 className="font-display text-[24px]">Hash report</h2>
          <p className="mt-1 text-muted">
            Enclosed with the certificate. Prepared by Saakshi on {prepared} IST from its sealing records. Every value below can be checked
            by anyone, without trusting Saakshi; see “How to check” at the end.
          </p>
          {items.map((item) => (
            <HashTable key={item.sha256} item={item} qr={qrs[item.sha256]} />
          ))}
        </section>

        <section className="mt-10 break-inside-avoid">
          <h2 className="font-display text-[24px]">How to check</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Open the verify link (or scan its code) and choose the file. Its SHA-256 is computed in your own browser.</li>
            <li>
              It re-computes the SHA-256 of each piece that was sealed (a recording is split back into its 5-second pieces) and checks it
              against the Merkle root.
            </li>
            <li>
              It then reads each transaction straight from the blockchain. Roots are written by the EvidenceAnchor contract,{" "}
              <span className="break-all font-mono text-[11px]">{ANCHOR_ADDRESS}</span>, on {CHAIN_NAME} (Polygon’s public test network).
            </li>
            <li>A single changed byte gives a different SHA-256, and the check fails.</li>
          </ol>
          <p className="mt-3 italic text-muted">
            A seal shows that a file is unchanged since the moment it was sealed. It does not by itself show what the file depicts or who
            made it.
          </p>
        </section>

        <section className="mt-12 break-before-page">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Only if the court asks for an expert’s certificate</p>
          <p className="mt-1 text-[15px] font-medium">Part B · To be filled by the expert</p>
          <p className="mt-4">
            I, <Blank w="14rem" />, daughter / son / spouse of <Blank w="12rem" />, residing at / employed at <Blank w="20rem" />, do hereby
            solemnly affirm and sincerely state and submit as follows:
          </p>
          <ol className="mt-4 list-decimal space-y-4 pl-5">
            <li>
              The produced electronic record / output of the digital record is obtained from the following device / digital record source:{" "}
              <Blank w="20rem" />
            </li>
            <li>
              I state that the hash value(s) of the electronic / digital record(s) is / are <Blank w="22rem" />, obtained through the
              following algorithm:
              <span className="mt-2 flex flex-wrap gap-x-5">
                <Box label="SHA1" />
                <Box label="SHA256" />
                <Box label="MD5" />
                <Box label="Other" />
              </span>
            </li>
          </ol>
          <Signature who="Name, designation and signature" />
        </section>

        <p className="mt-12 border-t border-hairline pt-4 text-[11px] leading-relaxed text-muted">
          This is a draft prepared by the Saakshi app from its records; it is not legal advice. Read it, correct anything that is wrong and
          sign it yourself. The police, a lawyer, or your District Legal Services Authority (free legal aid, call 15100) can help you
          complete it.
        </p>
      </article>

      <div className="mx-auto max-w-[860px] px-4 py-5 print:hidden" lang={lang}>
        <Button onClick={() => window.print()}>{tr("certPrint")}</Button>
      </div>
    </main>
  );
}

function HashTable({ item, qr }: { item: CertItem; qr?: string }) {
  const sealed = item.pieces.filter((p) => p.seal?.tx);
  const txs = [...new Map(sealed.map((p) => [p.seal!.tx!, p.seal!])).values()];
  const first = item.pieces.map((p) => p.capturedAt).sort()[0] ?? null;
  const lastSeal = sealed.map((p) => p.seal!.at ?? "").sort().at(-1) || null;
  return (
    <div className="mt-6 break-inside-avoid rounded-xl border border-hairline p-4">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">{item.label}</p>
          <p className="font-mono text-[11px] text-muted">{item.fileName}</p>
          <dl className="mt-2 grid grid-cols-[9.5rem_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-muted">SHA-256</dt>
            <dd className="break-all font-mono text-[11px]">{item.sha256}</dd>
            <dt className="text-muted">Size</dt>
            <dd>{item.bytes.toLocaleString("en-IN")} bytes</dd>
            <dt className="text-muted">Captured (phone clock)</dt>
            <dd>{istTime(first)}</dd>
            <dt className="text-muted">Sealed on {CHAIN_NAME}</dt>
            <dd>
              {sealed.length === item.pieces.length ? istTime(lastSeal) : `${sealed.length} of ${item.pieces.length} pieces so far`}
            </dd>
            {txs.map((s) => (
              <Tx key={s.tx} tx={s.tx!} block={s.block} root={s.root} />
            ))}
            <dt className="text-muted">Verify</dt>
            <dd className="break-all text-rani">{item.verifyUrl}</dd>
          </dl>
        </div>
        {qr && <div className="size-[104px] shrink-0 [&>svg]:size-full" role="img" aria-label="Verify QR" dangerouslySetInnerHTML={{ __html: qr }} />}
      </div>
      {item.pieces.length > 1 && (
        <table className="mt-3 w-full border-t border-hairline text-left text-[10.5px]">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-2 font-normal">Piece</th>
              <th className="py-1 pr-2 font-normal">SHA-256 of the piece</th>
              <th className="py-1 pr-2 font-normal">Bytes</th>
              <th className="py-1 font-normal">Recorded</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {item.pieces.map((p) => (
              <tr key={`${p.kind}${p.seq}`} className="border-t border-hairline/60 align-top">
                <td className="py-0.5 pr-2">{p.seq + 1}</td>
                <td className="break-all py-0.5 pr-2">{p.sha256}</td>
                <td className="py-0.5 pr-2">{p.size}</td>
                <td className="whitespace-nowrap py-0.5">
                  {new Date(p.capturedAt).toLocaleTimeString("en-IN", { timeStyle: "medium", timeZone: IST })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Tx({ tx, block, root }: { tx: string; block: number | null; root: string | null }) {
  return (
    <>
      <dt className="text-muted">Transaction{block ? ` · block ${block}` : ""}</dt>
      <dd className="break-all font-mono text-[11px]">
        <a href={txUrl(tx)} target="_blank" rel="noreferrer" className="text-rani">
          {tx}
        </a>
        {root && <span className="block text-muted">Merkle root {root}</span>}
      </dd>
    </>
  );
}

function Blank({ w }: { w: string }) {
  return <span className="inline-block border-b border-ink/40 align-bottom" style={{ width: w, maxWidth: "100%" }}>&nbsp;</span>;
}

function Box({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="inline-flex size-3.5 items-center justify-center border border-ink/60 text-[10px] leading-none">{checked ? "✓" : ""}</span>
      {label}
    </span>
  );
}

function Field({ k, v, wide }: { k: string; v: string | null; wide?: boolean }) {
  return (
    <span className={`flex gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="shrink-0 text-muted">{k}:</span>
      {v ? <span className="break-all">{v}</span> : <Blank w="100%" />}
    </span>
  );
}

function Signature({ who }: { who: string }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 break-inside-avoid sm:grid-cols-4">
      <span className="col-span-2 border-t border-ink/50 pt-1 text-muted">{who}</span>
      <span className="border-t border-ink/50 pt-1 text-muted">Date (DD/MM/YYYY)</span>
      <span className="border-t border-ink/50 pt-1 text-muted">Time (IST, 24-hour)</span>
      <span className="col-span-2 border-t border-ink/50 pt-1 text-muted sm:col-span-4 sm:w-1/2">Place</span>
    </div>
  );
}
