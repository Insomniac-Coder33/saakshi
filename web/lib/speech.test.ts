import { describe, expect, it } from "vitest";
import { chunks } from "./speech";

describe("splitting an answer for the voice", () => {
  it("keeps a short answer whole", () => {
    expect(chunks("You are not alone. Call 181.")).toEqual(["You are not alone. Call 181."]);
  });

  it("splits at sentence ends, including the danda, within the limit", () => {
    const bn = "তুমি একা নও। এটা আইনের আওতায় পড়ে। তুমি অভিযোগ করতে পারো।";
    const out = chunks(bn, 30);
    expect(out.every((c) => c.length <= 30)).toBe(true);
    expect(out.join(" ")).toBe(bn);
  });

  it("cuts a sentence longer than the limit rather than dropping it", () => {
    const long = "a".repeat(2000);
    const out = chunks(long, 900);
    expect(out.map((c) => c.length)).toEqual([900, 900, 200]);
  });

  it("loses no words across many sentences", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Step ${i} is to keep a copy safe.`).join(" ");
    const out = chunks(text);
    expect(out.every((c) => c.length <= 900)).toBe(true);
    expect(out.join(" ")).toBe(text);
  });
});
