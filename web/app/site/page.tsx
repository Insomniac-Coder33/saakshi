// The public showcase. Served at "/" on a showcase host only (see proxy.ts); the app's own address
// never shows it. Everything on it is real: live demo, real screenshots, live seal numbers.
// One dark plum world from top to bottom, like the SOS screen; hairlines divide it, never boxes.
import type { Metadata } from "next";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { Fingerprint } from "@/components/site/Fingerprint";
import { Header } from "@/components/site/Header";
import { LiveDemo } from "@/components/site/LiveDemo";
import { LiveStats } from "@/components/site/LiveStats";
import { OpeningEye } from "@/components/site/OpeningEye";
import { Phone, Screenshot } from "@/components/site/Phone";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { Story } from "@/components/site/Story";
import { Bead, Key } from "@/components/site/TrySteps";
import { ANCHOR_ADDRESS, EXPLORER, SOURCE_URL } from "@/lib/chain";
import { APP_ORIGIN, DEMO_DURESS_PIN, DEMO_PIN, VERIFY_ORIGIN } from "@/lib/site";
import { TONGUES, type Tongue } from "@/lib/tongues";

// The app’s own address, shown where the site explains why it’s so forgettable.
const APP_HOST = new URL(APP_ORIGIN).host;

export const metadata: Metadata = {
  title: "Saakshi · A witness that never looks away",
  description:
    "Saakshi hides inside a calculator. It silently records, encrypts every five seconds on her phone, and seals the evidence on Polygon so anyone can verify it.",
  robots: { index: true, follow: true },
  // The card a shared link shows. Only this page carries it; the app's address stays a calculator.
  metadataBase: new URL(VERIFY_ORIGIN),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Saakshi",
    title: "Saakshi · A witness that never looks away",
    description: "A calculator on her phone that silently records, encrypts every five seconds and seals the evidence on Polygon, so anyone can check it.",
    images: [{ url: "/site/og.jpg", width: 1200, height: 630, alt: "Saakshi: What happened has a witness." }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function Site() {
  const installQr = await QRCode.toString(`${APP_ORIGIN}/`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1d1419", light: "#0000" },
  });
  // For a judge at a computer: the same live demo, on the phone in their pocket.
  const demoQr = await QRCode.toString(`${APP_ORIGIN}/?demo`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1d1419", light: "#0000" },
  });

  return (
    <div className="bg-plum-night text-white">
      <SmoothScroll />
      <Header />
      <Hero demoQr={demoQr} />
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
      <Tested />
      <Limits />
      <Questions />
      <Built />
      <Install qr={installQr} />
      <Footer />
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="label text-rani-bright!">{children}</p>;
}

// A heading for a section of the page, under its eyebrow.
function Title({ eyebrow, children, className = "" }: { eyebrow: string; children: ReactNode; className?: string }) {
  return (
    <div className={`reveal ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">{children}</h2>
    </div>
  );
}

// Centred, like a title card: the third eye opens, then the promise, then the live app lit from behind,
// between two of its real screens. Each part waits its turn (the `opening` utilities), once, on load.
function Hero({ demoQr }: { demoQr: string }) {
  return (
    <section id="top" className="grain relative overflow-hidden pt-[76px]">
      <div
        aria-hidden
        className="opening-light pointer-events-none absolute left-1/2 top-[300px] h-[1000px] w-[1300px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(214,36,110,.36),rgba(214,36,110,.07)_55%,transparent)]"
      />
      <div className="relative mx-auto max-w-[1200px] px-6 pt-10 text-center md:px-10 lg:pt-[min(36px,4svh)]">
        <OpeningEye className="mx-auto size-14 lg:size-[64px]" />
        <h1 className="opening mt-6 font-display text-[56px] leading-[.95] tracking-[-.015em] sm:text-[88px] lg:text-[length:clamp(84px,min(8.4vw,12.5svh),120px)]" style={{ animationDelay: "1.75s" }}>
          What happened <em className="block text-rani-bright">has a witness.</em>
        </h1>
        <p style={{ animationDelay: "2s" }} className="opening mx-auto mt-7 max-w-[40rem] text-[18px] leading-[1.65] text-on-dark sm:text-[19px]">
          Saakshi lives inside an ordinary calculator. When something happens, it silently records, encrypts every five seconds on her
          phone, and seals the evidence on a public blockchain, so anyone can check it.
        </p>
        <div style={{ animationDelay: "2.15s" }} className="opening mt-9 flex flex-wrap justify-center gap-3">
          <a href="#try" className="flex h-14 items-center rounded-full bg-rani px-7 text-[16px] font-medium hover:bg-rani-deep">
            Try the live app
          </a>
          <a href="/verify" className="flex h-14 items-center rounded-full border border-white/20 px-7 text-[16px] font-medium hover:bg-white/10">
            Verify a file
          </a>
        </div>
      </div>

      <div style={{ animationDelay: "2.35s" }} className="opening relative mx-auto mt-14 flex max-w-[1200px] items-start justify-center gap-12 px-6 md:px-10 lg:mt-14">
        <SideScreen src="/site/sos.webp" tone="dark" />
        <div id="try" className="w-[min(300px,80vw)] flex-none scroll-mt-6">
          <LiveDemo />
        </div>
        <SideScreen src="/site/proof.webp" tone="light" />
      </div>
      <p style={{ animationDelay: "2.5s" }} className="opening relative mx-auto max-w-[34rem] px-6 pt-8 text-center text-[14px] leading-[1.9] text-on-dark-muted max-lg:pb-24">
        It’s a working calculator. Type{" "}
        <span className="whitespace-nowrap">
          <Key>{DEMO_PIN}</Key> then <Key>=</Key>
        </span>{" "}
        to open Saakshi, or tap the display three times for a silent SOS. Duress PIN <Key>{DEMO_DURESS_PIN}</Key>.
      </p>
      {/* On a computer only: on a phone, she's already holding it. */}
      <div style={{ animationDelay: "2.65s" }} className="opening relative mx-auto hidden w-fit items-center gap-4 pb-24 pt-6 lg:flex">
        <div className="size-[76px] rounded-[14px] bg-white p-2 [&>svg]:size-full" role="img" aria-label="QR code to open this demo on a phone" dangerouslySetInnerHTML={{ __html: demoQr }} />
        <p className="text-left text-[14px] leading-snug text-on-dark-muted">
          <span className="text-white">Try it on your phone.</span>
          <br />
          Scan to open this demo there, with the same PINs.
        </p>
      </div>
    </section>
  );
}

// The silent SOS and the proof, either side of the live app: the night and the morning after.
function SideScreen({ src, tone }: { src: string; tone: "light" | "dark" }) {
  return (
    <div aria-hidden className="mt-24 hidden w-[240px] flex-none brightness-[.42] lg:block">
      <Phone>
        <Screenshot src={src} alt="" tone={tone} />
      </Phone>
    </div>
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
    <section className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1200px] gap-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div className="reveal">
          <Eyebrow>Why it matters</Eyebrow>
          <h2 className="mt-4 font-display text-[44px] leading-[1.04] md:text-[60px]">
            The thread running through all of it is <em className="text-rani-bright">proof.</em>
          </h2>
          <p className="mt-6 max-w-[30rem] text-[18px] leading-[1.6] text-on-dark">
            Phones get snatched. Videos get deleted, or dismissed as edited. Saakshi makes sure the evidence survives the night and is
            believed in the morning.
          </p>
        </div>
        <dl className="grid gap-x-10 gap-y-12 self-center sm:grid-cols-2">
          {stats.map((s) => (
            <div key={s.n} className="reveal border-t border-white/15 pt-6">
              <dt className="font-display text-[56px] leading-none">
                {s.n} {s.unit && <span className="text-[24px] text-on-dark-muted">{s.unit}</span>}
              </dt>
              <dd className="mt-3 text-[15px] leading-snug text-on-dark">{s.label}</dd>
              <dd className="mt-2 text-[12px] text-on-dark-muted">{s.src}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section id="proof" className="grain bg-plum">
      <div className="relative mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
        <div className="reveal mx-auto max-w-[46rem] text-center">
          <Eyebrow>Proof, not promises</Eyebrow>
          <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[72px]">Anyone can check. Nobody has to trust us.</h2>
          <p className="mx-auto mt-6 max-w-[36rem] text-[18px] leading-[1.6] text-on-dark">
            Drop a recording on the Verify page. Your browser fingerprints it, splits it back into the five-second pieces it was sealed
            as, checks each one’s Merkle proof, and reads the seal straight from the blockchain. Change a single byte and it says so.
          </p>
        </div>

        <div className="reveal mt-16">
          <Fingerprint />
        </div>

        {/* What the Verify page says about its sample recording and the same file with one byte flipped, set in type. */}
        <div className="reveal mt-20 grid gap-5 md:grid-cols-2">
          <Result
            name="recording-20261103-2045.webm"
            hash="c2d9e85c … 4bee0453"
            verdict="Untampered"
            ok
            body={
              <>
                Recorded 3 Nov 2026, 8:45:55 pm IST. All 9 pieces sealed on Polygon Amoy, each within 69 s of being recorded.{" "}
                <a href={`${EXPLORER}/block/51896446`} target="_blank" rel="noreferrer" className="text-white underline underline-offset-2">
                  Block 51896446
                </a>
              </>
            }
          />
          <Result
            name="recording-20261103-2045.webm, byte 8,70,558 changed"
            hash="943ebfdd … 4f0d9772"
            verdict="No seal found"
            body="This file does not match any sealed fingerprint. If it is a copy of a file from Saakshi, it has been changed."
          />
        </div>
        <div className="mt-6 flex flex-col items-center gap-6 text-center">
          <p className="text-[13px] text-on-dark-muted">Our sample recording, and the same file with one byte changed. Check both yourself, or save its receipt and use the{" "}
            <a href="/verify-offline.html" className="text-white underline underline-offset-2">
              offline checker
            </a>
            , which never talks to Saakshi.</p>
          <a href="/verify#sample" className="flex h-14 items-center rounded-full bg-white px-7 text-[16px] font-medium text-ink hover:bg-blush">
            Try it on the Verify page
          </a>
        </div>

        <div className="reveal mt-24">
          <LiveStats />
        </div>
      </div>
    </section>
  );
}

function Result({ name, hash, verdict, ok = false, body }: { name: string; hash: string; verdict: string; ok?: boolean; body: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-plum-line bg-plum-night/55 p-7 md:p-9">
      <p className="break-all font-mono text-[13px] text-on-dark">{name}</p>
      <p className="mt-1 font-mono text-[12px] text-on-dark-muted">{hash}</p>
      <p className={`mt-7 font-display text-[48px] leading-none md:text-[56px] ${ok ? "text-[#7fd1ad]" : "text-rani-bright"}`}>{verdict}</p>
      <p className="mt-4 text-[15px] leading-[1.6] text-on-dark">{body}</p>
      {/* One mark per sealed piece; a changed copy matches none. */}
      <div aria-hidden className="mt-7 flex gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} className={`h-1.5 flex-1 rounded-full ${ok ? "bg-[#7fd1ad]/60" : "bg-white/10"}`} />
        ))}
      </div>
    </div>
  );
}

function Beyond() {
  const items = [
    {
      title: "Sahayak, her rights in her language",
      body: "Ask in Bengali, Hindi, English or eight more Indian languages, typed or spoken, and hear the answer read aloud. Answers cite only a fixed list of 27 sections and 8 helplines under BNS, BNSS, the DV Act, POSH, POCSO and the IT Act. Sahayak drafts the complaint for the police, a Protection Officer or the workplace committee, and the takedown request for the platform. Running on Gemma 4 through Adaption, with Sarvam behind it, it named a correct law for all 85 of our test questions, in 11 languages.",
    },
    {
      title: "Guardians who know at once",
      body: "Trusted people link through Telegram. When she starts an SOS they get her live location after a 10-second undo, at once if the duress PIN is used, and a warning if her phone goes silent. If her phone is lost or taken, two of them can let a new phone into her Saakshi; only her PIN opens it.",
    },
    {
      title: "A journal and photos, sealed",
      body: "Abuse is often a pattern, not one night. Dated diary entries and photos of injuries or messages are encrypted and sealed on Polygon like recordings.",
    },
    {
      title: "A certificate for court",
      body: "One tap prints the Section 63 certificate that the Bharatiya Sakshya Adhiniyam requires for electronic evidence: fingerprint, times, block and a QR code to verify. With a complaint from Sahayak, it prints as one packet, with where to get free legal help.",
    },
  ];
  return (
    <section id="more" className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
      <Title eyebrow="More than a recorder" className="max-w-[44rem]">
        From the night itself to the <em className="text-rani-bright">complaint.</em>
      </Title>
      <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
        {items.map((x) => (
          <div key={x.title} className="reveal border-t border-white/15 pt-7">
            <h3 className="font-display text-[34px] leading-[1.08]">{x.title}</h3>
            <p className="mt-4 max-w-[34rem] text-[16px] leading-[1.65] text-on-dark">{x.body}</p>
          </div>
        ))}
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
    <section id="hood" className="border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
        <Title eyebrow="Under the hood" className="max-w-[46rem]">
          A snatched phone can record more. It can’t read what was recorded.
        </Title>
        <div className="mt-16 grid gap-x-12 gap-y-14 md:grid-cols-3">
          {cols.map((c) => (
            <div key={c.where} className="reveal">
              <p className="label text-rani-bright!">{c.where}</p>
              <ul className="mt-5 text-[15px] leading-[1.6] text-on-dark">
                {c.lines.map((l) => (
                  <li key={l} className="border-t border-white/12 py-4">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-on-dark-muted">
          Contract:{" "}
          <a href={`${EXPLORER}/address/${ANCHOR_ADDRESS}`} target="_blank" rel="noreferrer" className="break-all font-mono text-[13px] text-rani-bright underline underline-offset-2">
            {ANCHOR_ADDRESS}
          </a>
          . Its source code is{" "}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-rani-bright underline underline-offset-2">
            verified on Sourcify
          </a>{" "}
          as an exact match.
        </p>
      </div>
    </section>
  );
}

// The numbers come from eval/results-adaption.json and eval/results-indic.json (run 1 Nov 2026)
// and from `npm test`. Change them when those change.
const EVAL_RUN = "1 Nov 2026";
const ASKED: Partial<Record<Tongue, number>> = { en: 15, bn: 15, hi: 15 };

function Tested() {
  const stats = [
    { n: "85/85", label: "questions where Sahayak named a correct law, answered in the language she asked in, and flagged danger when there was danger." },
    { n: "11/11", label: "questions describing danger marked urgent, at least one in every language." },
    { n: "3.7 s", label: "median time to an answer in English, Bengali and Hindi, on Gemma 4 through Adaption." },
    { n: "33", label: "unit tests, among them the encryption, the Merkle proofs, the calculator and phone recovery. GitHub runs them, with type and lint checks, on every change." },
  ];
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div>
          <Title eyebrow="How we test it">Checked before it’s claimed.</Title>
          <p className="reveal mt-6 max-w-[28rem] text-[16px] leading-[1.6] text-on-dark">
            We wrote 15 situations a woman might bring to Sahayak, and ask each in English, Bengali and Hindi, and five of them in eight
            more languages. A script checks every answer against the laws we listed for that situation. Gemma 4 answered 83 of the 85; Sarvam,
            its backup, answered two. Last run {EVAL_RUN}.
          </p>
        </div>
        <dl className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {stats.map((s) => (
            <div key={s.n} className="reveal border-t border-white/15 pt-6">
              <dt className="font-display text-[56px] leading-none">{s.n}</dt>
              <dd className="mt-3 text-[15px] leading-snug text-on-dark">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mx-auto max-w-[1200px] px-6 pb-24 md:px-10 md:pb-32">
        <p className="label text-rani-bright!">Passed, by language</p>
        <ul className="reveal mt-5 grid grid-cols-3 border-t border-white/15 sm:grid-cols-4 lg:grid-cols-11">
          {TONGUES.map((t) => {
            const n = ASKED[t.id] ?? 5;
            return (
              <li key={t.id} className="border-b border-white/10 py-4 pr-3">
                <p lang={t.id} className="text-[16px] text-white">
                  {t.label}
                </p>
                <p className="mt-1 font-display text-[24px] leading-none text-on-dark">
                  {n}/{n}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Limits() {
  const items = [
    ["The screen stays on.", "A web app can’t keep recording once the phone locks, so Saakshi holds the screen awake and black. A native Android app, our next step, would remove this."],
    ["A seal proves sameness, not truth.", "It shows a file is unchanged since it was captured. It doesn’t prove what the file shows."],
    ["Test network, for now.", "Seals go to Polygon Amoy during the hackathon. Moving to Polygon mainnet is a configuration change."],
    ["Information, not legal advice.", "Sahayak explains which laws may apply and drafts the complaint; Saakshi drafts the Section 63 certificate. She signs them, and the police, a lawyer or a court decide what happens."],
  ];
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <Title eyebrow="Honest limits">What it can’t do, said plainly.</Title>
        <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {items.map(([t, d]) => (
            <div key={t} className="reveal border-t border-white/15 pt-6">
              <dt className="font-display text-[28px] leading-tight">{t}</dt>
              <dd className="mt-3 text-[15px] leading-[1.6] text-on-dark">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// What people ask first, answered as plainly as the limits above. Native <details>: keyboard and
// screen readers get it for free, and it opens with no script at all.
function Questions() {
  const items = [
    [
      "Can Saakshi see her recordings?",
      "No. Each piece is encrypted on her phone before it leaves, with a key only her PIN unlocks. Our servers hold scrambled data, fingerprints and a locked copy of her key. Nobody here can play a single second.",
    ],
    [
      "What if someone takes her phone?",
      "They can stop the recording, not undo it. Every five seconds, what was recorded has already left the phone. Her guardians see her live location, and are told if the phone goes quiet.",
    ],
    [
      "What if someone knows her PIN?",
      "Then they can open the vault, as she can. That is why there is a second PIN: typed under pressure, it looks like everything stopped, while recording carries on and her guardians are told she may not be able to talk.",
    ],
    [
      "Why does the app have such a plain address?",
      `If someone checks her phone, they find a calculator and a forgettable address, ${APP_HOST}. Nothing that says she’s collecting evidence against them. Finding “Saakshi” in her browser history could put her in more danger, so the name lives only on this public site.`,
    ],
    [
      "Does a seal prove what happened?",
      "No. It proves the file hasn’t changed by a single byte since a moment fixed on Polygon. What the file shows is for the police and a court to weigh.",
    ],
    [
      "Will a court accept it?",
      "Electronic records are admissible with a certificate under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023. Saakshi fills one in from its seal records; she completes and signs it. Whether any evidence is accepted is for the court.",
    ],
    [
      "Does it work without internet?",
      "Recording does. Pieces wait on the phone, encrypted, and upload the moment there is a signal. Sealing and guardian alerts need a connection.",
    ],
    [
      "Does it cost her anything?",
      "No. She never needs a wallet or crypto: Saakshi pays for every seal. Sahayak and guardian alerts are free too.",
    ],
  ];
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <Title eyebrow="Questions" className="lg:sticky lg:top-16 lg:self-start">What people ask first.</Title>
        <div className="border-b border-white/15">
          {items.map(([q, a]) => (
            <details key={q} className="faq group border-t border-white/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-[24px] leading-tight md:text-[28px] [&::-webkit-details-marker]:hidden">
                {q}
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="flex-none fill-none stroke-rani-bright transition-transform duration-300 [stroke-linecap:round] [stroke-width:1.6] group-open:rotate-45">
                  <path d="M9 3v12M3 9h12" />
                </svg>
              </summary>
              <p className="max-w-[40rem] pb-7 text-[16px] leading-[1.6] text-on-dark">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Built() {
  const days = [
    { d: "19 Oct", t: "The idea, the research and the Round 1 pitch." },
    { d: "20 Oct", t: "Calculator disguise, silent SOS, encrypted 5-second capture, vault, duress PIN, undo, erase." },
    { d: "25 Oct", t: "Shortlisted for the final. Evidence sealed on Polygon; the public Verify page; this site." },
    { d: "26 Oct", t: "A sealed journal and photo vault, the Section 63 certificate, and Telegram guardian alerts with live location." },
    { d: "28–29 Oct", t: "Sahayak: legal help, complaints and takedown requests in Bengali, Hindi and English, typed or spoken, on Gemma 4 through Adaption. Tested on 45 questions." },
    { d: "30–31 Oct", t: "A sealed sample anyone can check on the Verify page. Moving to a new phone with her guardians’ approval. Sahayak reads its answers aloud." },
    { d: "1 Nov", t: "Sahayak in eight more Indian languages. The court packet: her complaint, dated from her journal, with the evidence certificate. An offline checker that never talks to Saakshi." },
    { d: "2 Nov", t: "Edge cases closed: an SOS cut off by a restart, browsers that can’t record, opening offline. The first Android build, disguised as a calculator." },
    { d: "3–4 Nov", t: "Tested live, end to end: a real SOS reached a guardian on Telegram, and every piece was sealed within 69 seconds. Sahayak passed 85 of 85 questions in 11 languages. The showcase moved to saakshi.dev." },
  ];
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-10 md:py-32">
        <Title eyebrow="Built during SHAKTI">Everything here started on 19 October.</Title>
        <ol className="mt-16">
          {days.map((x) => (
            <li key={x.d} className="reveal grid gap-2 border-t border-white/12 py-7 sm:grid-cols-[200px_1fr] sm:gap-10">
              <p className="font-display text-[34px] leading-none">{x.d}</p>
              <p className="max-w-[40rem] text-[16px] leading-[1.6] text-on-dark">{x.t}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Install({ qr }: { qr: string }) {
  return (
    <section className="grain bg-plum">
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-24 md:px-10 lg:grid-cols-[1fr_auto] lg:gap-20">
        <div className="reveal">
          <Eyebrow>Put it on a phone</Eyebrow>
          <h2 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[64px]">It installs as a calculator.</h2>
          <ol className="mt-8 max-w-[34rem] space-y-3 text-[17px] leading-[1.5] text-on-dark">
            <Step n={1}>Scan the code with an Android phone and open it in Chrome.</Step>
            <Step n={2}>Choose ⋮ then “Add to Home screen”. It appears as “Calculator”.</Step>
            <Step n={3}>Open it and set your own PIN. Nothing on the phone says Saakshi.</Step>
          </ol>
          <p className="mt-8 max-w-[34rem] text-[15px] leading-[1.6] text-on-dark-muted">
            If someone checks her phone, they find a calculator and a forgettable address: <span className="whitespace-nowrap text-white">{APP_HOST}</span>. Nothing that says she’s collecting evidence against them.
          </p>
        </div>
        <div className="reveal mx-auto rounded-[28px] bg-white p-7 text-center text-ink">
          <div className="size-[200px] [&>svg]:size-full" role="img" aria-label="QR code to open Saakshi" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-4 text-[13px] text-muted">Scan to open the app</p>
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

function Footer() {
  return (
    <footer className="text-on-dark-muted">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-12 text-[14px] md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-4">
          <img src="/brand/seal-pink.svg" alt="" className="size-10" />
          <p>
            <span className="text-white">Saakshi</span> · <span lang="hi">साक्षी</span> · <span lang="bn">সাক্ষী</span>: witness.
          </p>
        </div>
        <p>Built by Team Appvengers for the SHAKTI Hackathon 2026.</p>
      </div>
    </footer>
  );
}
