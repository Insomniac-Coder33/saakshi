// The languages Sahayak answers, speaks and drafts in. Saakshi's own screens are in English, Bengali
// and Hindi (lib/i18n.ts); Sahayak reaches further, because the models and Sarvam's voices cover the
// other major Indian languages, and the laws it explains are the same across India.
import type { Language } from "./local";

export type Tongue = Language | "mr" | "te" | "ta" | "gu" | "kn" | "ml" | "or" | "pa";

export interface TongueInfo {
  id: Tongue;
  label: string; // in its own script
  english: string;
  locale: string; // for the browser's speech recognition
  voice: string; // Sarvam's language code for the Bulbul voice
  address: string; // how Sahayak speaks to her; the models otherwise drift between familiar and formal
  script: RegExp; // one letter of its script, for checking an answer came back in it
}

const DEVANAGARI = /[ऀ-ॿ]/;

// Ordered by how many people speak them, after Saakshi's three.
export const TONGUES: TongueInfo[] = [
  { id: "en", label: "English", english: "English", locale: "en-IN", voice: "en-IN", address: "", script: /[A-Za-z]/ },
  {
    id: "bn",
    label: "বাংলা",
    english: "Bengali",
    locale: "bn-IN",
    voice: "bn-IN",
    address: "as তুমি (তোমার, তোমাকে, করো), never আপনি, the way the rest of Saakshi speaks to her",
    script: /[ঀ-৿]/,
  },
  { id: "hi", label: "हिन्दी", english: "Hindi", locale: "hi-IN", voice: "hi-IN", address: "as आप", script: DEVANAGARI },
  { id: "mr", label: "मराठी", english: "Marathi", locale: "mr-IN", voice: "mr-IN", address: "as तुम्ही", script: DEVANAGARI },
  { id: "te", label: "తెలుగు", english: "Telugu", locale: "te-IN", voice: "te-IN", address: "as మీరు", script: /[ఀ-౿]/ },
  { id: "ta", label: "தமிழ்", english: "Tamil", locale: "ta-IN", voice: "ta-IN", address: "as நீங்கள்", script: /[஀-௿]/ },
  { id: "gu", label: "ગુજરાતી", english: "Gujarati", locale: "gu-IN", voice: "gu-IN", address: "as તમે", script: /[઀-૿]/ },
  { id: "kn", label: "ಕನ್ನಡ", english: "Kannada", locale: "kn-IN", voice: "kn-IN", address: "as ನೀವು", script: /[ಀ-೿]/ },
  { id: "ml", label: "മലയാളം", english: "Malayalam", locale: "ml-IN", voice: "ml-IN", address: "as നിങ്ങൾ", script: /[ഀ-ൿ]/ },
  { id: "or", label: "ଓଡ଼ିଆ", english: "Odia", locale: "or-IN", voice: "od-IN", address: "as ଆପଣ", script: /[଀-୿]/ },
  { id: "pa", label: "ਪੰਜਾਬੀ", english: "Punjabi", locale: "pa-IN", voice: "pa-IN", address: "as ਤੁਸੀਂ", script: /[਀-੿]/ },
];

export const TONGUE_IDS = TONGUES.map((t) => t.id);
export const isTongue = (x: unknown): x is Tongue => TONGUE_IDS.includes(x as Tongue);
export const tongueOf = (id: Tongue): TongueInfo => TONGUES.find((t) => t.id === id) ?? TONGUES[0];

/** One of Saakshi's own screen languages, or null for the languages only Sahayak speaks. */
export const screenLanguage = (id: Tongue): Language | null => (id === "en" || id === "bn" || id === "hi" ? id : null);
