# Saakshi

*Saakshi* means witness. It is a web app (PWA) that looks and works like an ordinary calculator. Behind it, a woman can start a silent SOS that records audio, video and location in encrypted 5-second pieces, fingerprints each piece on her phone, and seals the fingerprints on Polygon, so the evidence survives even if the phone is taken and anyone can check it hasn’t been changed.

Built solo by team **Appvengers** for the SHAKTI Hackathon (Women Safety / Blockchain track, “Dharma & Trust”).

| | |
|---|---|
| **Try it** | [web-alpha-orcin-85.vercel.app/?demo](https://web-alpha-orcin-85.vercel.app/?demo): a demo setup with PIN **1931** (then `=`) and duress PIN **0000**. Tap the calculator display three times to start an SOS. |
| **About it** | [saakshi-witness.vercel.app](https://saakshi-witness.vercel.app), with the app running live inside a phone |
| **Verify a file** | [saakshi-witness.vercel.app/verify](https://saakshi-witness.vercel.app/verify) |
| **Contract** | `EvidenceAnchor` on Polygon Amoy, [`0x39eA5AB65824af57297cE863CB54B1A84E3C4719`](https://amoy.polygonscan.com/address/0x39eA5AB65824af57297cE863CB54B1A84E3C4719). Source code [verified on Sourcify](https://repo.sourcify.dev/80002/0x39eA5AB65824af57297cE863CB54B1A84E3C4719) as an exact match. |

## What works today

### The disguise and the SOS
- **Calculator disguise.** A fully working calculator. The home-screen name and icon say “Calculator”, and so do the page title, browser storage names and service worker cache.
- **Her PIN and `=`** opens Saakshi. Any other number just calculates.
- **Silent SOS.** Three taps on the calculator display. The screen goes plum, then black after 8 seconds. A wake lock keeps recording alive.
- **Encrypted 5-second pieces.** `MediaRecorder` slices video and audio every 5 seconds, plus location fixes. Each piece is fingerprinted (SHA-256 of the plaintext), encrypted on the phone (AES-GCM), written to an IndexedDB outbox and uploaded at once. Uploads retry when the signal returns.
- **Self-healing capture.** If the phone takes the camera away mid-SOS (a call, another app), recording restarts within about a second as a new segment, falling back to microphone only.
- **Duress PIN.** Typed while she is being forced to stop, it looks as if the SOS stopped, but recording carries on and the session is flagged.
- **Ten seconds to undo.** Undo erases every trace of an accidental SOS, on the phone and on the server.
- **Vault.** After her PIN she can play recordings back (decrypted on the phone), check their fingerprints, and delete one recording or everything.

### Sealed and checkable
- **Sealed on Polygon.** Each fingerprint is salted and gathered into a Merkle tree, and only the root goes on-chain, through `EvidenceAnchor` on Polygon Amoy (about 24,000 gas a root). A relayer pays, so she never needs a wallet. A database job seals every minute, even after her phone is gone.
- **Public Verify page.** Anyone can drop a downloaded recording on it. It is hashed in the browser, split into its pieces, and every Merkle proof and transaction is checked on-chain from the browser. A recording’s proof screen shows a QR code that opens its result. Without a file of your own, the page checks a sealed sample recording, then the same file with one byte changed.
- **Section 63 certificate.** One tap prints the certificate the Bharatiya Sakshya Adhiniyam requires for electronic evidence: fingerprint, times, block and the verify QR code.

### Beyond the night itself
- **Journal and photo vault.** Dated entries and photos of injuries or messages, encrypted and sealed like recordings.
- **Guardians on Telegram.** Trusted people link through the Saakshi Guardian bot. When she starts an SOS they get her live location after the 10-second undo, at once if the duress PIN is used, and a warning if her phone goes silent.
- **Moving to a new phone.** If her phone is lost, broken or taken, a new phone shows a six-digit code. She reads it to her guardians, who send it to the bot and approve. After two approvals (or her only guardian’s), every other device is signed out of her account, the new phone signs in with a single-use token, and her PIN opens her recordings there. Guardians vouch for her; they can never open anything.
- **Sahayak, legal help in her language.** She asks in Bengali, Hindi, English or a mix, typed or spoken, and can have the answer read aloud in her language (Sarvam’s Bulbul voice). Answers may cite only ids from a checked list of 27 sections and 8 helplines (`web/lib/law.ts`), and the law cards show our text, never the model’s. Sahayak drafts:
  - an FIR request to any police station (a Zero FIR);
  - an application to a Protection Officer under the Domestic Violence Act;
  - a complaint to the Internal Committee at her workplace (POSH);
  - a takedown request to the platform under Rule 3(2)(b) of the IT Rules, 2021;
  - the text for cybercrime.gov.in.

  Each draft can list her sealed evidence.
- **Bengali, Hindi and English** throughout the app.

## How the encryption works
Each woman has an ECDH P-256 key pair.
- **Public key:** stays usable on the phone, so an SOS can encrypt without her PIN.
- **Private key:** wrapped with a key derived from her PIN (PBKDF2, 150,000 rounds).
- **Each session:** gets an ephemeral key pair. ECDH plus HKDF gives that session’s AES-GCM key.

A snatched, unlocked phone can record more evidence, but it can’t read what was already recorded. The server stores only ciphertext, fingerprints and the wrapped key.

## Sahayak’s models and evaluation
Sahayak tries models in order and moves on when one is busy or slow:
1. **Gemma 4 31B through Adaption**, SHAKTI’s technology partner;
2. **Sarvam-105B**;
3. **Gemini**.

`SAHAYAK_MODELS` reorders or limits them without a deploy. Every answer must fit a JSON schema whose law and helpline fields accept only our ids.

`eval/` holds 15 situations, each asked in Bengali, Hindi and English. An answer passes if it cites an expected law, is in the right language and flags danger when there is danger. Each provider was run on its own:

| Model | Passed | Median time |
|---|---|---|
| Gemma 4 31B (Adaption) | 45/45 | 3.4 s |
| Gemini (Flash and Flash-Lite) | 45/45 | 6.6 s |
| Sarvam-105B | 44/45 | 1.3 s |

Run it against a running app with `node eval/run.mjs <base-url>`.

## Repository
| Path | What |
|---|---|
| `web/` | Next.js 16 PWA (App Router, Tailwind v4), Supabase client, Web Crypto. The showcase site is `web/app/site`. |
| `contracts/` | `EvidenceAnchor.sol` and its solc-js deploy script. `deployment.json` holds the address, ABI and compiler metadata. |
| `supabase/migrations/` | Schema, row-level security, audit triggers, the private evidence bucket and the sealing job |
| `supabase/migrate.mjs` | Applies migrations in order (`node supabase/migrate.mjs`) |
| `eval/` | Sahayak’s evaluation set, runner and each model’s results |
| `brand/` | Design system and UI kit (`screens.html`) that the app matches |
| `round1/` | Round 1 pitch deck |
| `BUILD_PLAN.md` | Every deck claim mapped to its implementation |

## Running it
1. Put the values below in `.env.local` at the repo root (`SETUP.md` shows where to find the Supabase ones).
2. Run `node supabase/migrate.mjs`.
3. Run `cd web && npm install && npm run dev`.
4. Run the tests with `npm test`.

Camera, microphone, wake lock and service workers need HTTPS or `localhost`.

| Variable | What it’s for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The Supabase project |
| `SUPABASE_SECRET_KEY` | Server routes: sealing, alerts, erasing |
| `RELAYER_PRIVATE_KEY` | The wallet that pays for seals on Polygon Amoy |
| `AMOY_RPC_URL` | Optional; a public Amoy RPC is used otherwise |
| `TELEGRAM_BOT_TOKEN` | Guardian alerts |
| `ADAPTION_API_KEY`, `SARVAM_API_KEY`, `GEMINI_API_KEY` | Sahayak’s models; any one is enough. `SARVAM_API_KEY` also reads answers aloud |
| `SAHAYAK_MODELS` | Optional; comma-separated model ids, in order |
| `NEXT_PUBLIC_APP_ORIGIN`, `NEXT_PUBLIC_VERIFY_ORIGIN`, `SITE_HOSTS` | Optional; the app and showcase domains |

## Honest limits
- A web app can’t keep recording reliably once the phone is locked, so Saakshi holds the screen awake and dark.
- A seal proves a file is unchanged since capture, not that what it shows is true.
- Seals go to Polygon Amoy, a test network, during the hackathon. Moving to mainnet is a configuration change.
- Moving to a new phone needs at least one guardian linked beforehand, and her PIN. If she forgets her PIN, nobody can open her recordings, us included.
- Sahayak gives legal information, not legal advice. She signs anything it drafts, and the police, a lawyer or a court decide what happens.

## Built before and during SHAKTI
Everything here was built during the hackathon, from 19 Oct 2026.
