# Saakshi: notes for Claude

Saakshi is a women’s-safety PWA disguised as a calculator, built for the SHAKTI Hackathon. `README.md` says what it does; `BUILD_PLAN.md` maps every Round 1 promise to what shipped.

## Design brief
The brand lives in `brand/`. Its rules win over general design advice, including any design skill. App screens match `brand/screens.html`, the UI kit.

@brand/README.md

In practice:
- **One accent.** Rani pink (`#D6246E`, or `#FF6FA5` on dark) is the only accent. Plum is for dark surfaces. Green (`#2F7A5F`) only ever means “untampered”.
- **Two typefaces.** Instrument Serif for headlines, names, numbers and quotes; DM Sans for body text and UI; Tiro Bangla and Tiro Devanagari Hindi for Bengali and Hindi.
- **Labels are rare.** Uppercase tracked labels are for data labels only, not for navigation or buttons.
- **Hairlines, not boxes.** No icon-in-a-circle cards, no gradients for decoration, no second accent colour.
- **Show the real product.** Use real screenshots (`web/public/site/`), not illustrations of it.
- **Keep the disguise whole.** The home-screen name and icon say Calculator, and storage names stay `calc*`. The Saakshi mark never appears on the home screen or in the calculator.
- **Copy.** Curly quotes and apostrophes; short sentences in her words; no stacked “X, not Y” slogans; no em-dash asides; honest about scope. In Bengali, the app speaks to her as তুমি; in Hindi, as आप.

## Proposing visual changes
- A visible change must show on first load, not only after scrolling or hovering.
- The showcase header stays still: no scroll-driven effects.
- For subjective visual work, show two or three options side by side, as screenshots at 1440 px and 390 px, before building one.
- Check every width from 360 px to 1920 px for sideways scrolling, and check keyboard focus and `prefers-reduced-motion`.

## Engineering notes
@web/AGENTS.md

- Tailwind v4: write `min-[75rem]:`, not `min-[1200px]:` (arbitrary px variants sort before the rem breakpoints, so `md:` wins), and use `_` for spaces inside arbitrary `calc()`.
- Secrets live in the git-ignored root `.env.local`. Never print or commit them.
- Tests: `cd web && npm test`. Sahayak’s evaluation: `node eval/run.mjs <base-url>` against a running app.
- Test sign-ups are anonymous Supabase users. List recent users before deleting any; real people use the live app.
- Never delete user `573c7030-2d5b-4cb3-881e-cca6f09dc1d1`. It holds the Verify page’s sample recording (`web/public/sample/`), which only checks as untampered while its seal records exist. Keep `db0a4559-5432-4a44-9d9f-39b54e41de57` too: it held the earlier sample.
