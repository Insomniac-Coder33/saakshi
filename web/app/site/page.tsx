// The public showcase. Served at "/" on a showcase host only (see proxy.ts); the app's own address
// never shows it. Everything on it is real: live demo, real screenshots, live seal numbers.
import type { Metadata } from "next";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { Header } from "@/components/site/Header";
import { LiveDemo } from "@/components/site/LiveDemo";
import { LiveStats } from "@/components/site/LiveStats";
import { Story } from "@/components/site/Story";
import { Bead } from "@/components/site/TrySteps";
import { ANCHOR_ADDRESS, EXPLORER, SOURCE_URL } from "@/lib/chain";
import { APP_ORIGIN, DEMO_DURESS_PIN, DEMO_PIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "Saakshi · A witness that never looks away",
  description:
    "Saakshi hides inside a calculator. It silently records, encrypts every five seconds on her phone, and seals the evidence on Polygon so anyone can verify it.",
  robots: { index: true, follow: true },
};

export default async function Site() {
  const installQr = await QRCode.toString(`${APP_ORIGIN}/`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1d1419", light: "#0000" },
  });

  return (
    <div className="bg-white text-ink">
      <Header />
      <Hero />
      <Problem />
      <section id="story" className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-4 max-w-[16ch] font-display text-[48px] leading-[1.02] md:text-[72px]">One night, five moments.</h2>
        <div className="mt-8 lg:mt-0">
          <Story />
        </div>
      </section>
      <Proof />
      <Beyond />
      <UnderTheHood />
      <Limits />
      <Built />
      <Install qr={installQr} />
      <Footer />
    </div>
  );
}

function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <p className={`label ${dark ? "text-rani-bright!" : ""}`}>{children}</p>;
}

// From laptops and landscape tablets up: copy | steps | phone in its arch, one row, with the steps strung on
// the arch's left leg. Below that: copy, phone, steps, in reading order.
function Hero() {
  return (
    <section id="top" className="grain overflow-hidden bg-[#0e080d] text-white">
      <div aria-hidden className="pointer-events-none absolute -left-64 top-0 size-[700px] rounded-full bg-[radial-gradient(circle,rgba(97,23,56,.16),transparent_67%)]" />
      <div aria-hidden className="pointer-events-none absolute -right-56 top-12 size-[900px] rounded-full bg-[radial-gradient(circle,rgba(174,42,92,.13),transparent_65%)]" />

      <div className="relative mx-auto max-w-[1360px] px-6 pb-0 pt-[116px] md:px-10 lg:pt-[132px] xl:px-12">
        <div className="grid lg:grid-cols-[minmax(0,1.04fr)_minmax(0,.96fr)] lg:gap-10 xl:gap-16">
          <div className="animate-rise relative z-10 max-w-[680px] lg:pt-[80px]">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-rani-bright" />
              <Eyebrow dark>A private witness, always close</Eyebrow>
            </div>
            <h1 className="mt-9 font-display text-[clamp(57px,5.35vw,84px)] leading-[1.01] tracking-[-.025em]">
              A witness that <em className="block font-normal text-rani-bright">never looks away.</em>
            </h1>
            <p className="mt-8 max-w-[31rem] text-[18px] leading-[1.7] text-on-dark sm:text-[19px]">
              Hidden in an ordinary calculator. Ready to quietly capture and encrypt evidence when it matters, with a public seal anyone can check later.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
              <a href="#try" className="inline-flex h-14 items-center gap-5 rounded-full bg-rani px-7 text-[15px] font-semibold text-white transition-colors hover:bg-rani-bright">
                Experience Saakshi <span aria-hidden>↗</span>
              </a>
              <a href="/verify" className="group inline-flex h-12 items-center gap-2 border-b border-white/30 text-[15px] font-medium text-white transition-colors hover:border-rani-bright">
                Verify a file <span aria-hidden className="transition-transform group-hover:translate-x-1">↗</span>
              </a>
            </div>
            <div className="mt-16 max-w-[31rem] border-t border-white/15 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-rani-bright">Made for the moment after</p>
              <p className="mt-2 text-[14px] leading-relaxed text-on-dark-muted">
                Recorded on her phone. Encrypted before upload. Sealed so the original can be checked.
              </p>
            </div>
          </div>

          <div id="try" className="relative mx-auto mt-16 w-full max-w-[610px] scroll-mt-6 pb-2 lg:mt-0">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-[47%] aspect-square w-[96%] max-w-[570px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.055]" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-[47%] aspect-square w-[76%] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rani-bright/[.12]" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-[47%] h-[70%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(177,37,92,.32),rgba(82,20,52,.12)_47%,transparent_72%)] blur-2xl" />

            <div className="relative flex items-center justify-between gap-4 border-b border-white/10 pb-4 text-[11px] font-semibold uppercase tracking-[.16em] text-on-dark-muted">
              <span>01 / The live experience</span>
              <span className="flex items-center gap-2 text-rani-bright"><i aria-hidden className="size-1.5 rounded-full bg-rani-bright" /> Interactive demo</span>
            </div>
            <div className="relative mx-auto mt-9 w-[min(300px,82vw)] lg:w-[min(294px,calc(46svh-112px))]">
              <LiveDemo />
            </div>
            <div className="relative mx-auto mt-8 grid max-w-[500px] grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-[.13em] text-on-dark-muted">Open the vault</p>
                <p className="mt-1 font-mono text-[13px] text-white">{DEMO_PIN} =</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.13em] text-on-dark-muted">Silent SOS</p>
                <p className="mt-1 text-[13px] text-white">Tap display ×3</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.13em] text-on-dark-muted">Duress PIN</p>
                <p className="mt-1 font-mono text-[13px] text-white">{DEMO_DURESS_PIN}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-white/10 py-6 text-[11px] font-medium uppercase tracking-[.13em] text-on-dark-muted lg:mt-10">
          <span>Saakshi · witness in Bengali, Hindi and English</span>
          <span>Capture <i aria-hidden className="mx-2 text-rani-bright">/</i> Encrypt <i aria-hidden className="mx-2 text-rani-bright">/</i> Verify</span>
        </div>
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Bead n={n} className="mt-px flex-none" />
      <span>{children}</span>
    </li>
  );
}

function Problem() {
  const stats = [
    { n: "77", unit: "of 100", label: "women who face violence never tell anyone or seek help.", src: "NFHS-5, 2019–21" },
    { n: "4,48,211", unit: "", label: "crimes against women registered in 2023: over 1,200 a day.", src: "NCRB, Crime in India 2023" },
    { n: "1 in 5", unit: "", label: "cases of crime against women ended in conviction, 2017–2023.", src: "NCRB data, The Wire" },
    { n: "3.7%", unit: "", label: "conviction rate for crimes against women in West Bengal, 2023.", src: "NCRB, Crime in India 2023" },
  ];
  return (
    <section className="border-b border-hairline bg-blush">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div className="reveal">
            <Eyebrow>Why it matters</Eyebrow>
            <h2 className="mt-4 font-display text-[44px] leading-[1.04] md:text-[60px]">
              The thread running through all of it is <em className="text-rani">proof.</em>
            </h2>
            <p className="mt-6 max-w-[30rem] text-[18px] leading-[1.6] text-muted">
              Phones get snatched. Videos get deleted, or dismissed as edited. Saakshi makes sure the evidence survives the night and is
              believed in the morning.
            </p>
          </div>
          <dl className="grid gap-px self-start overflow-hidden rounded-[24px] bg-blush-line sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.n} className="reveal bg-white p-7">
                <dt className="font-display text-[52px] leading-none">
                  {s.n} {s.unit && <span className="text-[24px] text-muted">{s.unit}</span>}
                </dt>
                <dd className="mt-3 text-[15px] leading-snug">{s.label}</dd>
                <dd className="mt-3 text-[12px] text-muted">{s.src}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section id="proof" className="grain bg-plum text-white">
      <div className="relative mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="reveal">
            <Eyebrow dark>Proof, not promises</Eyebrow>
            <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">Anyone can check. Nobody has to trust us.</h2>
            <p className="mt-6 max-w-[32rem] text-[18px] leading-[1.6] text-on-dark">
              Drop a recording on the Verify page. Your browser fingerprints it, splits it back into the five-second pieces it was sealed
              as, checks each one’s Merkle proof, and reads the seal straight from the blockchain. Change a single byte and it says so.
            </p>
            <a href="/verify" className="mt-9 inline-flex h-14 items-center rounded-full bg-white px-7 text-[16px] font-medium text-ink hover:bg-blush">
              Open the Verify page
            </a>
          </div>
          <div className="reveal self-center">
            <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_50px_90px_-40px_rgba(0,0,0,.7)] ring-1 ring-white/10">
              <div className="flex h-9 items-center gap-1.5 border-b border-hairline bg-[#f6eef2] px-4" aria-hidden>
                <i className="size-2.5 rounded-full bg-[#e2c9d4]" />
                <i className="size-2.5 rounded-full bg-[#e2c9d4]" />
                <i className="size-2.5 rounded-full bg-[#e2c9d4]" />
              </div>
              {/* On a phone, the phone-width Verify page, so its results are readable. */}
              <picture>
                <source media="(max-width: 639px)" srcSet="/site/verify-phone.webp" />
                <img src="/site/verify.webp" alt="The Verify page: the original file untampered, a changed copy with no seal" className="w-full" loading="lazy" />
              </picture>
            </div>
            <p className="mt-3 text-[13px] text-on-dark-muted">A real check from our tests: the original, and a copy with one byte changed.</p>
          </div>
        </div>
        <div className="reveal mt-16">
          <LiveStats />
        </div>
      </div>
    </section>
  );
}

function Beyond() {
  const items = [
    {
      title: "Sahayak, her rights in her language",
      body: "Ask in Bengali, Hindi, English or a mix, typed or spoken. Answers cite only a fixed list of 27 sections and 8 helplines under BNS, BNSS, the DV Act, POSH, POCSO and the IT Act. Sahayak drafts the complaint for the police, a Protection Officer or the workplace committee, and the takedown request for the platform. Running on Gemma 4 through Adaption, it named a correct law for all 45 of our test questions.",
    },
    {
      title: "Guardians who know at once",
      body: "Trusted people link through Telegram. When she starts an SOS they get her live location after a 10-second undo, at once if the duress PIN is used, and a warning if her phone goes silent.",
    },
    {
      title: "A journal and photos, sealed",
      body: "Abuse is often a pattern, not one night. Dated diary entries and photos of injuries or messages are encrypted and sealed on Polygon like recordings.",
    },
    {
      title: "A certificate for court",
      body: "One tap prints the Section 63 certificate that the Bharatiya Sakshya Adhiniyam requires for electronic evidence: fingerprint, times, block and a QR code to verify.",
    },
  ];
  return (
    <section id="more" className="border-b border-hairline bg-blush">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
        <div className="reveal max-w-[44rem]">
          <Eyebrow>More than a recorder</Eyebrow>
          <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">
            From the night itself to the <em className="text-rani">complaint.</em>
          </h2>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[24px] bg-blush-line ring-1 ring-blush-line sm:grid-cols-2">
          {items.map((x, i) => (
            <div key={x.title} className="reveal bg-white p-8">
              <span className="flex size-7 items-center justify-center rounded-full bg-alert-bg text-[12px] font-medium text-rani">{i + 1}</span>
              <h3 className="mt-5 font-display text-[30px] leading-tight">{x.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-muted">{x.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UnderTheHood() {
  const cols = [
    {
      where: "On her phone",
      lines: [
        "An ECDH P-256 key pair; the private key is wrapped by her PIN (PBKDF2, 150,000 rounds).",
        "Each SOS gets a fresh session key: ECDH + HKDF → AES-GCM-256.",
        "Every 5-second piece is fingerprinted (SHA-256), then encrypted, before it leaves the phone.",
        "An offline queue in IndexedDB retries the moment there’s signal.",
      ],
    },
    {
      where: "On our servers",
      lines: [
        "Only ciphertext, fingerprints and her wrapped key. We can’t watch a single second.",
        "Row-level security on every table, and an append-only audit trail.",
        "Anonymous accounts: no phone number, no email.",
        "“Erase everything” removes her recordings, keys and account.",
      ],
    },
    {
      where: "On Polygon",
      lines: [
        "Each fingerprint is salted and gathered into a Merkle tree; only the root goes on-chain.",
        "EvidenceAnchor.sol records each root for about 24,000 gas.",
        "A relayer pays, so she never needs a wallet. A seal lands within about a minute.",
        "A database job seals every minute, even after her phone is gone.",
      ],
    },
  ];
  return (
    <section id="hood" className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
      <div className="reveal max-w-[44rem]">
        <Eyebrow>Under the hood</Eyebrow>
        <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">A snatched phone can record more. It can’t read what was recorded.</h2>
      </div>
      <div className="mt-14 grid gap-px overflow-hidden rounded-[24px] bg-hairline ring-1 ring-hairline md:grid-cols-3">
        {cols.map((c, i) => (
          <div key={c.where} className="reveal bg-white p-8">
            <p className="flex items-center gap-3 text-[13px] font-medium uppercase tracking-[0.16em] text-rani">
              <span className="flex size-7 items-center justify-center rounded-full bg-alert-bg text-[12px]">{i + 1}</span>
              {c.where}
            </p>
            <ul className="mt-6 space-y-4 text-[15px] leading-[1.55]">
              {c.lines.map((l) => (
                <li key={l} className="border-t border-hairline pt-4 first:border-0 first:pt-0">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[14px] text-muted">
        Contract:{" "}
        <a href={`${EXPLORER}/address/${ANCHOR_ADDRESS}`} target="_blank" rel="noreferrer" className="break-all font-mono text-[13px] text-rani underline underline-offset-2">
          {ANCHOR_ADDRESS}
        </a>
        . Its source code is{" "}
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-rani underline underline-offset-2">
          verified on Sourcify
        </a>{" "}
        as an exact match.
      </p>
    </section>
  );
}

function Limits() {
  const items = [
    ["The screen stays on.", "A web app can’t keep recording once the phone locks, so Saakshi holds the screen awake and black. A native Android app, our next step, would remove this."],
    ["A seal proves sameness, not truth.", "It shows a file is unchanged since it was captured. It doesn’t prove what the file shows."],
    ["Test network, for now.", "Seals go to Polygon Amoy during the hackathon. Moving to Polygon mainnet is a configuration change."],
    ["Information, not legal advice.", "Sahayak explains which laws may apply and drafts the complaint; Saakshi drafts the Section 63 certificate. She signs them, and the police, a lawyer or a court decide what happens."],
  ];
  return (
    <section className="border-y border-hairline bg-blush">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-24 md:px-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div className="reveal">
          <Eyebrow>Honest limits</Eyebrow>
          <h2 className="mt-4 font-display text-[44px] leading-[1.04] md:text-[56px]">What it can’t do, said plainly.</h2>
        </div>
        <dl className="grid gap-8 sm:grid-cols-2">
          {items.map(([t, d]) => (
            <div key={t} className="reveal border-t border-blush-line pt-5">
              <dt className="font-display text-[26px] leading-tight">{t}</dt>
              <dd className="mt-2 text-[15px] leading-[1.55] text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Built() {
  const days = [
    { d: "19 Oct", t: "The idea, the research and the Round 1 pitch.", done: true },
    { d: "20 Oct", t: "Calculator disguise, silent SOS, encrypted 5-second capture, vault, duress PIN, undo, erase.", done: true },
    { d: "25 Oct", t: "Shortlisted for the final. Evidence sealed on Polygon; the public Verify page; this site.", done: true },
    { d: "26 Oct", t: "A sealed journal and photo vault, the Section 63 certificate, and Telegram guardian alerts with live location.", done: true },
    { d: "28–29 Oct", t: "Sahayak: legal help, complaints and takedown requests in Bengali, Hindi and English, typed or spoken, on Gemma 4 through Adaption. Tested on 45 questions.", done: true },
    { d: "Next", t: "The Android app, so recording carries on with the screen locked.", done: false },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
      <div className="reveal">
        <Eyebrow>Built during SHAKTI</Eyebrow>
        <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">Everything here started on 19 October.</h2>
      </div>
      <ol className="mt-14 grid gap-px overflow-hidden rounded-[24px] bg-hairline ring-1 ring-hairline sm:grid-cols-2 lg:grid-cols-3">
        {days.map((x) => (
          <li key={x.d} className="reveal bg-white p-7">
            <p className={`flex items-center gap-2 text-[13px] font-medium ${x.done ? "text-verified" : "text-rani"}`}>
              <i className={`size-2 rounded-full ${x.done ? "bg-verified" : "bg-rani"}`} />
              {x.done ? "Done" : "Planned"}
            </p>
            <p className="mt-4 font-display text-[34px] leading-none">{x.d}</p>
            <p className="mt-4 text-[15px] leading-[1.55] text-muted">{x.t}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Install({ qr }: { qr: string }) {
  return (
    <section className="grain bg-plum-night text-white">
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-24 md:px-10 lg:grid-cols-[1fr_auto] lg:gap-20">
        <div className="reveal">
          <Eyebrow dark>Put it on a phone</Eyebrow>
          <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">It installs as a calculator.</h2>
          <ol className="mt-8 max-w-[34rem] space-y-3 text-[17px] leading-[1.5] text-on-dark">
            <Step n={1}>Scan the code with an Android phone and open it in Chrome.</Step>
            <Step n={2}>Choose ⋮ then “Add to Home screen”. It appears as “Calculator”.</Step>
            <Step n={3}>Open it and set your own PIN. Nothing on the phone says Saakshi.</Step>
          </ol>
        </div>
        <div className="reveal mx-auto rounded-[28px] bg-white p-7 text-center text-ink">
          <div className="size-[200px] [&>svg]:size-full" role="img" aria-label="QR code to open Saakshi" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-4 text-[13px] text-muted">Scan to open the app</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-plum-night text-on-dark-muted">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 border-t border-white/10 px-6 py-12 text-[14px] md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-4">
          <img src="/brand/seal-pink.svg" alt="" className="size-10" />
          <p>
            <span className="text-white">Saakshi</span> · <span lang="hi">साक्षी</span> · <span lang="bn">সাক্ষী</span>: witness.
          </p>
        </div>
        <p>Built solo by Team Appvengers for the SHAKTI Hackathon 2026.</p>
      </div>
    </footer>
  );
}
