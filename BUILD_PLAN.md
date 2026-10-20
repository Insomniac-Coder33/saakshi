# Saakshi: build plan for the coding round

Every promise in the Round 1 deck, and how it gets built. The coding window runs from 21 Oct (after the Round 1 noon deadline) to the evening of 24 Oct; the Round 2 video closes at 25 Oct 00:01 IST.

**Target:** an installable web app (PWA) on **Android Chrome**. iOS is best-effort.

**Design target:** `brand/screens.html` (UI kit) plus `brand/theme.css` (Tailwind v4 tokens). Slides 7, 11 and 12 of the deck show renders of these exact screens, so the app must match them:
- calculator disguise (`brand/icons/calculator-*` in the manifest)
- silent SOS (plum, "9 saved · 6 sealed", Hold to stop)
- guardian alert with a time-limited live location
- proof screen with the Verify QR and a Section 63 download
- Bengali agent chat with citation chips
- desktop Verify page that hashes the file in the browser

## Deck claim → implementation
| Deck claim | How we build it | Day |
|---|---|---|
| Looks like a working calculator; her PIN and `=` opens Saakshi | Calculator UI is the PWA home screen; manifest name and icon say "Calculator" | 21 |
| Duress PIN looks like cancel, silently escalates | A second PIN shows the normal "cancelled" screen but flags the session as duress and keeps alerting | 21 |
| Silent SOS: three taps on the display, screen goes dark | Triple-tap handler; black UI plus Screen Wake Lock API keep recording alive | 21 |
| Audio, video and location in encrypted 5-second pieces | `MediaRecorder` with a 5 s timeslice + `watchPosition`; each piece encrypted with AES-GCM (Web Crypto) and uploaded straight away | 21 |
| If the phone is snatched, everything up to then is safe | Upload each piece as soon as it's recorded; at most the last 5 s is lost | 21 |
| SHA-256 fingerprint on her phone | `crypto.subtle.digest` on the plaintext piece, before encryption | 21 |
| Sealed on Polygon; one salted fingerprint per batch | `EvidenceAnchor.sol` (Hardhat) on **Polygon Amoy**; leaf = H(salt‖hash); a Merkle root is anchored at a session's first piece, then every ~30 s | 22 |
| Gasless, she never needs a wallet | Server-side relayer wallet signs with ethers.js; keys stay in Vercel environment variables | 22 |
| Public Verify page | Drop a file → hash it in the browser → look up its salt and Merkle proof → check the root on-chain | 22 |
| QR code any officer can verify | QR links to the Verify result for that recording (hash and timestamp only, no content) | 22 |
| Her trusted contact gets an alert with her live location | Web Push (VAPID) to the guardian's installed Saakshi; time-limited live-location page (Leaflet + OpenStreetMap) | 22 |
| Consent first: sharing is time-limited and visible | Sharing only during an SOS or for a chosen duration; a visible banner on her screen | 22 |
| AI agent explains which laws apply, with citations | Claude API with tool-calling; a curated corpus of BNS / BNSS / BSA / DV Act / POSH / IT Act provisions is loaded into context; citations are checked against the corpus before display | 23 |
| Speak or type in Bengali, Hindi or English | Web Speech API (`bn-IN`, `hi-IN`, `en-IN`) for voice input; Claude replies in her language | 23 |
| Drafts the complaint, Zero FIR request and Section 63 certificate | Claude drafts the text; `pdf-lib` fills a Section 63 Part A draft with hash values; she reviews and signs | 23 |
| Routing to 112, 181, NCW, One Stop Centre, cybercrime.gov.in, NALSA 15100 | Static, verified links and `tel:` links; no "nearest centre" claims | 23 |
| Hidden journal (Mitali) and screenshot vault (Ananya) | Same seal pipeline for text entries and image uploads | 23 |
| Draft takedown request the same night | Claude drafts the request for the platform's grievance officer; she sends it herself | 23 |
| Under 18 → POCSO help and Childline 1098 | An age question at onboarding changes routing | 23 |
| Works offline: queues and syncs later | IndexedDB queue + retry on the `online` event and Background Sync | 24 |
| Ten seconds to undo; calling 112 is her choice | Cancel countdown; the app never contacts police on its own | 21 |
| Encrypted before it leaves her phone; erasure built in | Key derived from her vault PIN (PBKDF2); delete removes the ciphertext and the wrapped key | 21–23 |
| Row-level security and audit log | Supabase RLS policies + an `audit_log` table written by the API | 21–22 |

## Deliberately *not* in the MVP (roadmap slide only)
- Power-button or volume-button trigger, and SMS fallback: these need a native Android app.
- Key recovery through trusted contacts (Shamir secret sharing).
- Integrations with ERSS 112 and e-FIR portals.
- A triage model trained on Adaption: a stretch goal, mentioned only in the speaker notes.

## You need to set up before 21 Oct
1. **Accounts:** GitHub (public repo), Vercel, Supabase (free tier).
2. **Anthropic API key**, with a few dollars of credit.
3. **Test wallet with Polygon Amoy POL from a faucet.** Faucets can rate-limit or ask for verification, so do this *first*. If no faucet works, tell me and we'll switch chains *and* update the deck wording.
4. **Two Android phones** with Chrome (Ria and Payel) for the demo video.

## Known limits we state honestly
- A web app can't keep recording reliably once the phone is locked, so Saakshi holds a wake lock with a black screen.
- The seal proves a file hasn't changed since capture, not that what it shows is true.
- Legal text is information, not legal advice.
