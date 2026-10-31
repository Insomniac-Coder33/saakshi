// Server only. Sahayak's answers read aloud in her language, by Sarvam's Bulbul voice, for women who
// would rather listen than read. Nothing is kept: the text goes to Sarvam and the audio comes back.
import type { Language } from "./local";

const VOICE = "priya";
const LANG_CODE: Record<Language, string> = { en: "en-IN", bn: "bn-IN", hi: "hi-IN" };

export const speechReady = () => !!process.env.SARVAM_API_KEY;

/** Splits text at sentence ends (., ?, ! or the danda) into pieces of at most `max` characters. */
export function chunks(text: string, max = 900): string[] {
  const out: string[] = [];
  let cur = "";
  for (const sentence of text.replace(/\s+/g, " ").trim().split(/(?<=[.!?।])\s+/)) {
    for (let s = sentence; s; s = s.slice(max)) {
      const piece = s.slice(0, max);
      if (cur && cur.length + 1 + piece.length > max) {
        out.push(cur);
        cur = piece;
      } else cur = cur ? `${cur} ${piece}` : piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** One MP3 for the whole text. MP3 frames stand alone, so the pieces simply join end to end. */
export async function speak(lang: Language, text: string): Promise<Uint8Array> {
  const parts = await Promise.all(
    chunks(text).map(async (piece) => {
      const res = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: { "content-type": "application/json", "api-subscription-key": process.env.SARVAM_API_KEY! },
        body: JSON.stringify({ text: piece, target_language_code: LANG_CODE[lang], model: "bulbul:v3", speaker: VOICE, output_audio_codec: "mp3" }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`sarvam tts ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const { audios } = (await res.json()) as { audios: string[] };
      return Buffer.from(audios.join(""), "base64");
    }),
  );
  return new Uint8Array(Buffer.concat(parts));
}
