import type { Metadata, Viewport } from "next";
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
      className={`${instrumentSerif.variable} ${dmSans.variable} ${tiroBangla.variable} ${tiroDevanagari.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
