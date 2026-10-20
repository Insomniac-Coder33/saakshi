# Saakshi brand

One identity for the pitch deck and the app. Start with `screens.html`, the UI kit; it is the visual target for the coding round.

## Idea
Saakshi means *witness*. On Mahalaya, Kumartuli's artisans paint the goddess's eyes: *chokkhu daan*, the gift of sight. Saakshi gives every woman a witness that never looks away. The brand should feel like a calm, trustworthy elder sister: confident, never cute, never alarming.

## Marks (`logo/`)
| File | Use |
|---|---|
| `wordmark-on-light` / `wordmark-on-dark` (.svg, .png) | The name. The dot of the *i* is a rani-pink bindi. Never recolour, stretch or retype it. |
| `mark` | Durga's vertical third eye inside a rani bindi. App chat avatar, notifications. |
| `seal-pink` / `seal-plum` | The mark ringed by "WITNESSED · SEALED · BELIEVED". Use it wherever evidence is verified: the Verify page, the proof screen, the certificate PDF. Use pink on dark backgrounds and plum on pink. |
| `icons/calculator-*` | The **disguise** icon for the PWA manifest. It must look like an ordinary calculator; never put the Saakshi mark on the home screen. |

## Colour (`tokens.css`, `theme.css`)
- **Rani pink** `#D6246E` (`#FF6FA5` on dark) is the only accent. It's the pink of Bengali festive saris, and pink is already India's visual language for women's safety. Use it deep and confident, never pastel.
- **Plum** `#1C0914` for dark surfaces. The SOS screen is always plum: dark, discreet, calm.
- **Blush** `#FCEEF3` for tinted backgrounds; otherwise white, ink `#1D1419` and muted `#76626D`.
- **Green** `#2F7A5F` only for "untampered". Never decorative.
- Full-rani backgrounds are for statement moments only (one idea, large type).

## Type
- **Instrument Serif** for headlines, names, numbers and quotes. Regular and italic only.
- **DM Sans** for body text and UI. Medium for labels and buttons.
- **Tiro Bangla** and **Tiro Devanagari Hindi** for Bengali and Hindi. Never fall back to a heavy system font when these are available.
- Labels: 11px DM Sans Medium, uppercase, 0.16em tracking, in rani. Use them sparingly, for data labels only.
- Fixed scale only (see `tokens.css`). In the deck: 10, 14, 16, 20, 24, 32, 40, 56, 72 and 120 pt on a 12-column grid.

## Copy rules
- Curly quotes and apostrophes (’ “ ”) everywhere. Straight `'` and `"` look amateur in a serif.
- Short sentences in her words. No "X, not Y" slogans stacked slide after slide, no em-dash asides, no jargon on her screens.
- Be honest about scope. The seal proves a file is unchanged since capture, not that what it shows is true. Legal text is information, not advice.

## Layout
- Let type and whitespace do the work. Use hairline rules instead of boxes; no icon-in-a-circle cards, gradients-for-decoration or multiple accent colours.
- Show the real product (the screens in `renders/`) instead of icons.
- Every control on the SOS path is at least 56px tall.

## Files
- `screens.html`: UI kit with six screens: calculator disguise, silent SOS, guardian alert, proof QR, AI agent (Bengali), and the desktop Verify page. Serve the folder over HTTP to view it (for example `npx serve .`), because browsers block local font files on `file://`.
- `renders/`: transparent PNGs of each screen, used by the deck. Regenerate with `tools/render-screens.js` (Node + `puppeteer-core` + `sharp`, using the installed Microsoft Edge).
- `tools/brand-build.js`: regenerates the wordmark, mark, seal, icons, glow and QR from the fonts (Node + `opentype.js` + `sharp` + `qrcode`).
- `fonts/`: all SIL Open Font License. In the app, load them with `next/font/google`.
