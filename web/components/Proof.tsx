"use client";

// The proof under any piece of evidence: its verify code, whether it is sealed yet, its fingerprint
// and transaction, and the ways to hand it on (the original file, a verify link, a certificate).
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { txUrl } from "@/lib/chain";
import { t, type StringKey } from "@/lib/i18n";
import type { Language } from "@/lib/local";
import { shortHash, type SealInfo } from "@/lib/recordings";
import { Button } from "./ui";
import { LOCALE } from "./Vault";

/** Saves a blob under a plain name, so the file in her Downloads doesn't say what it is. */
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** 20261026-2147, for file names. */
export { fileStamp } from "@/lib/recordings";

export function ProofPanel({
  lang,
  verifyUrl,
  sealed,
  lastSeal,
  hash,
  qrNote,
  onDownload,
  onCertificate,
}: {
  lang: Language;
  verifyUrl: string | null; // null until every piece is on the server
  sealed: boolean;
  lastSeal: SealInfo | null;
  hash: string | undefined;
  qrNote: StringKey;
  onDownload: () => void;
  onCertificate: () => void;
}) {
  const tr = (k: StringKey) => t(lang, k);
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toString(verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1d1419", light: "#0000" } }).then(
      (svg) => setQr({ url: verifyUrl, svg }),
      () => {},
    );
  }, [verifyUrl]);

  async function share() {
    if (!verifyUrl) return;
    try {
      if (navigator.share) return await navigator.share({ url: verifyUrl });
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // She closed the share sheet.
    }
  }

  return (
    <section className="mt-5" lang={lang}>
      <div className="flex flex-col items-center rounded-sheet border border-hairline p-5">
        {qr && qr.url === verifyUrl ? (
          <div className="size-[164px] [&>svg]:size-full" role="img" aria-label="QR" dangerouslySetInnerHTML={{ __html: qr.svg }} />
        ) : (
          <div className="size-[164px] animate-pulse rounded-card bg-blush" />
        )}
        <p className="mt-3.5 max-w-[260px] text-center text-caption leading-[1.45] text-muted">{verifyUrl ? tr(qrNote) : tr("qrWaits")}</p>
      </div>
      <span
        className={`mt-4 inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium ${sealed ? "bg-verified-bg text-verified" : "bg-blush text-muted"}`}
      >
        {sealed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" className="fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
            <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
          </svg>
        ) : (
          <i className="size-2 animate-pulse rounded-full bg-rani" />
        )}
        {sealed ? tr("untampered") : `${tr("sealing")}…`}
      </span>
      <dl className="mt-2">
        {lastSeal?.at && (
          <Fact k={tr("sealedAt")} v={new Date(lastSeal.at).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" })} />
        )}
        {hash && <Fact k={tr("fileFingerprint")} v={shortHash(hash)} mono />}
        {lastSeal?.tx && (
          <Fact
            k={tr("anchoredOn")}
            v={
              <a className="text-rani underline underline-offset-2" href={txUrl(lastSeal.tx)} target="_blank" rel="noreferrer">
                Polygon
              </a>
            }
          />
        )}
      </dl>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button onClick={onDownload}>{tr("downloadOriginal")}</Button>
        <Button variant="ghost" onClick={share} disabled={!verifyUrl}>
          {copied ? tr("linkCopied") : tr("shareVerify")}
        </Button>
        <Button variant="ghost" onClick={onCertificate} disabled={!verifyUrl}>
          {tr("certificate")}
        </Button>
      </div>
    </section>
  );
}

export function Fact({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-[11px] text-body-sm">
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right ${mono ? "font-mono text-caption" : ""}`}>{v}</dd>
    </div>
  );
}

