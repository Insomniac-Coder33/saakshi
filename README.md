# Saakshi

*Saakshi* means witness. It is a web app (PWA) that looks and works like an ordinary calculator. Behind it, a woman can start a silent SOS that records audio, video and location in encrypted 5-second pieces, fingerprints each piece on her phone, and keeps it safe even if the phone is taken.

Built solo by team **Appvengers** for the SHAKTI Hackathon (Women Safety / Blockchain track, "Dharma & Trust").

## What works today
- **Calculator disguise.** A fully working calculator. The home-screen name and icon say "Calculator", and so do the page title, browser storage names and service worker cache.
- **Her PIN and `=`** opens Saakshi. Any other number just calculates.
- **Silent SOS.** Three taps on the calculator display. The screen goes plum, then black after 8 seconds. A wake lock keeps recording alive.
- **Encrypted 5-second pieces.** `MediaRecorder` slices video and audio every 5 seconds, plus location fixes. Each piece is:
  1. fingerprinted with SHA-256 of the plaintext,
  2. encrypted on the phone with AES-GCM,
  3. written to an IndexedDB outbox, then
  4. uploaded to Supabase Storage.

  Uploads retry when the signal returns.
- **Self-healing capture.** If the phone takes the camera away mid-SOS (a call, another app), recording restarts within about a second as a new segment, falling back to microphone only.
- **Duress PIN.** Typed while being forced to stop, it looks like the SOS stopped, but recording continues and the session is flagged.
- **Ten seconds to undo.** Undo erases every trace of an accidental SOS, here and on the server.
- **Vault.** After her PIN, she can list recordings, play them back (decrypted on the phone), check their fingerprints, and delete a recording or everything.
- **Bengali, Hindi and English** on every SOS and onboarding screen.

## How the encryption works
Each woman has an ECDH P-256 key pair.
- **Public key:** stays usable on the phone, so an SOS can encrypt without her PIN.
- **Private key:** wrapped with a key derived from her PIN (PBKDF2, 150,000 rounds).
- **Each session:** gets an ephemeral key pair. ECDH plus HKDF gives that session's AES-GCM key.

A snatched, unlocked phone can record more evidence, but it can't read what was already recorded. The server stores only ciphertext, fingerprints and the wrapped key.

## Repository
| Path | What |
|---|---|
| `web/` | Next.js 16 PWA (App Router, Tailwind v4), Supabase client, Web Crypto |
| `supabase/migrations/` | Schema, row-level security, audit triggers, private evidence bucket |
| `supabase/migrate.mjs` | Applies migrations in order (`node supabase/migrate.mjs`) |
| `brand/` | Design system and UI kit (`screens.html`) that the app matches |
| `round1/` | Round 1 pitch deck |
| `BUILD_PLAN.md` | Every deck claim mapped to its implementation |

## Running it
1. Put the Supabase values in `.env.local` at the repo root (see `SETUP.md`).
2. Run `node supabase/migrate.mjs`.
3. Run `cd web && npm install && npm run dev`.
4. Run the tests with `npm test`.

Camera, microphone, wake lock and service workers need HTTPS or `localhost`.

## Honest limits
- A web app can't keep recording reliably once the phone is locked, so Saakshi holds the screen awake and dark.
- A seal proves a file is unchanged since capture, not that what it shows is true.
- Legal information in the app is information, not legal advice.

## Built before and during SHAKTI
Everything here was built during the hackathon, from 19 Oct 2026.
