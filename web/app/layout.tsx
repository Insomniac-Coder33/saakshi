import type { Metadata, Viewport } from "next";
import { Noto_Serif_Gujarati, Noto_Serif_Malayalam, Noto_Serif_Oriya, Tiro_Gurmukhi, Tiro_Kannada, Tiro_Tamil, Tiro_Telugu } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const instrumentSerif = localFont({
  variable: "--font-instrument-serif",
  src: [
    { path: "./fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
});

const dmSans = localFont({
  variable: "--font-dm-sans",
  src: [
    { path: "./fonts/DMSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/DMSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/DMSans-Italic.ttf", weight: "400", style: "italic" },
  ],
});

// The Indic faces are large, so they load only when Bengali or Hindi text is on screen.
const tiroBangla = localFont({
  variable: "--font-tiro-bangla",
  src: "./fonts/TiroBangla-Regular.ttf",
  preload: false,
});

const tiroDevanagari = localFont({
  variable: "--font-tiro-devanagari",
  src: "./fonts/TiroDevanagariHindi-Regular.ttf",
  preload: false,
});

// The languages only Sahayak speaks (lib/tongues.ts): Tiro where the family has the script, Noto Serif
// where it doesn’t. Like the faces above, each loads only when its script is on screen. They carry only their
// script, so no Times-shaped stand-in: Latin letters in an answer fall through to DM Sans (globals.css).
const tiroTamil = Tiro_Tamil({ variable: "--font-tiro-tamil", weight: "400", subsets: ["tamil"], preload: false, adjustFontFallback: false });
const tiroTelugu = Tiro_Telugu({ variable: "--font-tiro-telugu", weight: "400", subsets: ["telugu"], preload: false, adjustFontFallback: false });
const tiroKannada = Tiro_Kannada({ variable: "--font-tiro-kannada", weight: "400", subsets: ["kannada"], preload: false, adjustFontFallback: false });
const tiroGurmukhi = Tiro_Gurmukhi({ variable: "--font-tiro-gurmukhi", weight: "400", subsets: ["gurmukhi"], preload: false, adjustFontFallback: false });
const notoGujarati = Noto_Serif_Gujarati({ variable: "--font-noto-gujarati", weight: "400", subsets: ["gujarati"], preload: false, adjustFontFallback: false });
const notoMalayalam = Noto_Serif_Malayalam({ variable: "--font-noto-malayalam", weight: "400", subsets: ["malayalam"], preload: false, adjustFontFallback: false });
const notoOriya = Noto_Serif_Oriya({ variable: "--font-noto-oriya", weight: "400", subsets: ["oriya"], preload: false, adjustFontFallback: false });
const SAHAYAK_FONTS = [tiroTamil, tiroTelugu, tiroKannada, tiroGurmukhi, notoGujarati, notoMalayalam, notoOriya].map((f) => f.variable).join(" ");

// The installed app must look like an ordinary calculator, so nothing here names Saakshi.
export const metadata: Metadata = {
  title: "Calculator",
  description: "Calculator",
  applicationName: "Calculator",
  appleWebApp: { capable: true, title: "Calculator", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f0d0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${tiroBangla.variable} ${tiroDevanagari.variable} ${SAHAYAK_FONTS}`}
    >
      <body>{children}</body>
    </html>
  );
}
