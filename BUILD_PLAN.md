# Saakshi: what Round 1 promised, and what shipped

Every promise in the Round 1 deck (`round1/Saakshi_Round1_Appvengers.pdf`), how it was built, and where to find it. Where the approach changed during the build, the row says what changed and why.

**Shipped:** built and live at [web-alpha-orcin-85.vercel.app](https://web-alpha-orcin-85.vercel.app/?demo). **Changed:** the promise holds, by a different route than the deck planned. **Started:** begun, not finished.

The plan was written on 20 Oct for an installable web app (PWA) on Android Chrome. The build ran from 19 Oct to 4 Nov 2026.

## The disguise and the SOS
| Deck promise | Status | How it was built | Where |
|---|---|---|---|
| Looks like a working calculator; her PIN and `=` opens Saakshi | Shipped | A full calculator is the home screen. The manifest, page title, icon, storage names and service worker cache all say “Calculator”. | `web/components/Calculator.tsx`, `web/lib/calc.ts` |
| Silent SOS: three taps on the display, screen goes dark | Shipped | Triple tap starts it; the plum screen turns black after 8 seconds; a Screen Wake Lock keeps recording alive. | `web/components/Calculator.tsx`, `web/components/Sos.tsx`, `web/lib/capture.ts` |
| Audio, video and location in encrypted 5-second pieces | Shipped | `MediaRecorder` with a 5-second timeslice, plus `watchPosition`. If the camera is taken away mid-SOS, recording restarts as a new segment, falling back to microphone only. | `web/lib/capture.ts` |
| If the phone is snatched, everything up to then is safe | Shipped | Each piece is uploaded the moment it is recorded, so at most the last 5 seconds are lost. | `web/lib/sync.ts` |
| Duress PIN looks like cancel, silently escalates | Shipped | A second PIN shows the calculator as if the SOS stopped; recording carries on, the session is flagged and guardians are told at once. | `web/components/Sos.tsx`, `web/lib/alerts.ts` |
| Ten seconds to undo; calling 112 is her choice | Shipped | Undo erases every trace on the phone and the server. The app never contacts the police; guardians are told to call 112 if they think she is in danger. | `web/lib/telegram.ts` |
| Works offline: queues and syncs later | Shipped | Encrypted pieces wait in an IndexedDB outbox and upload when the `online` event fires or on the next retry. Background Sync was not needed. | `web/lib/sync.ts` |

## Encryption and the seal
| Deck promise | Status | How it was built | Where |
|---|---|---|---|
| SHA-256 fingerprint on her phone | Shipped | `crypto.subtle.digest` on each plain piece, before encryption. | `web/lib/crypto.ts` |
| Encrypted before it leaves her phone | Shipped | An ECDH P-256 key pair per woman; the private key is wrapped by her PIN (PBKDF2, 150,000 rounds); each session’s AES-GCM key comes from ECDH and HKDF. The server holds only ciphertext. | `web/lib/crypto.ts`, `web/lib/crypto.test.ts` |
| Sealed on Polygon; one salted fingerprint per leaf | Changed | Leaf = SHA-256(salt ‖ fingerprint), gathered into a Merkle tree; only the root goes on-chain through `EvidenceAnchor` on Polygon Amoy. **Changed:** the deck planned a root every ~30 seconds from the app; a database job (pg_cron) now seals every minute, so sealing carries on even after her phone is gone. Pieces are sealed within about a minute of capture. | `contracts/EvidenceAnchor.sol`, `web/app/api/seal/route.ts`, `supabase/migrations/0006_seal_cron.sql` |
| Contract built and deployed | Changed | **Changed:** compiled and deployed with solc-js and ethers instead of Hardhat, which kept the toolchain small. The source is verified on Sourcify as an exact match. | `contracts/`, [Sourcify](https://repo.sourcify.dev/80002/0x39eA5AB65824af57297cE863CB54B1A84E3C4719) |
| Gasless: she never needs a wallet | Shipped | A server relayer wallet signs every seal with ethers.js; its key lives only in Vercel’s environment. | `web/app/api/seal/route.ts` |
| Public Verify page | Shipped | Drop a file: it is hashed in the browser, split into its pieces, and every Merkle proof and root is checked on-chain from the browser. A sealed sample shows Untampered, then No seal found with one byte changed. | `web/components/Verify.tsx`, [saakshi.dev/verify](https://saakshi.dev/verify) |
| QR code any officer can verify | Shipped | Each recording’s proof screen shows a QR code that opens its Verify result: fingerprint and times only, never the content. | `web/components/Proof.tsx` |
| Row-level security and audit log | Shipped | Supabase row-level security on every table, and an `audit_log` written by database triggers. | `supabase/migrations/0001_core.sql` |
| Erasure built in | Shipped | Delete one recording or everything; erasing removes the ciphertext, fingerprints and wrapped key, and leaves only an anonymous audit entry. | `web/app/api/erase/route.ts` |
| Not in the deck: checking without Saakshi | Shipped | An offline checker, one self-contained page, checks a file and its proof receipt against Polygon without ever talking to Saakshi. | `web/public/verify-offline.html` |

## Guardians
| Deck promise | Status | How it was built | Where |
|---|---|---|---|
| Her trusted contact gets an alert with her live location | Changed | **Changed:** the plan was Web Push to a guardian’s installed app with a Leaflet map. Guardians now link through a Telegram bot instead, with nothing to install: they get the SOS after the 10-second undo, a Telegram live location that follows her, and a warning if her phone goes quiet. | `web/lib/alerts.ts`, `web/app/api/telegram/route.ts` |
| Consent first: sharing is time-limited and visible | Shipped | Her location is shared only during an SOS, as a Telegram live location that ends with it (at most 8 hours). Her screen shows that guardians are being alerted. Her location passes through the server and is never stored. | `web/lib/alerts.ts` |
| Roadmap: key recovery through trusted contacts | Changed | **Changed:** instead of Shamir secret sharing, guardians approve moving Saakshi to a new phone (two approvals, or her only guardian’s). Her PIN still opens the recordings; guardians can never open anything. | `web/lib/recovery.ts`, `web/app/api/recover/` |

## Sahayak, the legal helper
| Deck promise | Status | How it was built | Where |
|---|---|---|---|
| AI agent explains which laws apply, with citations | Changed | **Changed:** the plan was the Claude API. Sahayak runs on Gemma 4 31B through Adaption, SHAKTI’s technology partner, with Sarvam-105B and Gemini behind it. Answers must fit a JSON schema that accepts only ids from a checked list of 27 sections and 8 helplines; the law cards show our text, never the model’s. Tested on 85 questions in 11 languages. | `web/lib/sahayak.ts`, `web/lib/law.ts`, `eval/` |
| Speak or type in Bengali, Hindi or English | Shipped, and more | Voice input through the browser’s speech recognition; answers in any of 11 Indian languages, read aloud by Sarvam’s Bulbul voice. | `web/components/Sahayak.tsx`, `web/lib/speech.ts` |
| Drafts the complaint, Zero FIR request and Section 63 certificate | Changed | Sahayak drafts an FIR request (Zero FIR), a Protection Officer application, a POSH complaint, a platform takedown and the text for cybercrime.gov.in, dated from her journal if she chooses. **Changed:** the Section 63 certificate is filled in from the seal records and printed from the page (or saved as PDF) instead of with `pdf-lib`. The court packet prints the complaint, the certificate and free legal help as one document. | `web/components/Certificate.tsx`, `web/components/CourtPacket.tsx` |
| Draft takedown request the same night | Shipped | A request to the platform’s grievance officer under Rule 3(2)(b) of the IT Rules, 2021. She sends it herself. | `web/lib/sahayak.ts` |
| Routing to 112, 181, NCW, One Stop Centre, cybercrime.gov.in, NALSA 15100 | Shipped | Fixed, checked numbers and links: 112, 181 (One Stop Centres), 1930, cybercrime.gov.in, NCW, 15100, 1098 and Tele-MANAS 14416. No “nearest centre” claims. | `web/lib/law.ts` |
| Under 18 → POCSO help and Childline 1098 | Shipped | An age question at setup. If she is under 18, Sahayak always includes POCSO and Childline 1098 and suggests telling a trusted adult. | `web/components/Onboarding.tsx`, `web/lib/sahayak.ts` |
| Hidden journal (Mitali) and screenshot vault (Ananya) | Shipped | Dated journal entries and photos, encrypted and sealed like recordings. | `web/components/Evidence.tsx` |

## The deck’s roadmap
| Roadmap item | Status |
|---|---|
| Power-button or volume-button trigger, SMS fallback | Not yet. These need the native Android app. |
| A native Android app | Started. `mobile/` is a Capacitor shell named and iconed as Calculator, with a foreground service that keeps recording with the screen locked. It is not yet proven on a real phone. |
| Key recovery through trusted contacts | Changed and shipped, as above. |
| Integrations with ERSS 112 and e-FIR portals | Not yet. |
| A triage model trained on Adaption | Not built. Sahayak uses Adaption’s hosted Gemma 4 instead. |

## By design
- During an SOS, Saakshi keeps the screen awake and black, so recording carries on and the phone looks switched off.
- A seal proves a file hasn’t changed since capture. What the file shows is for the police and a court to weigh.
- Seals go to Polygon Amoy during the hackathon; the same contract and relayer move to Polygon mainnet with a configuration change.
- Sahayak gives legal information and drafts; she reviews and signs anything it writes.
