import { describe, expect, it } from "vitest";
import { isTongue, screenLanguage, tongueOf, TONGUES } from "./tongues";

describe("tongues", () => {
  it("names each language in its own script", () => {
    for (const t of TONGUES) expect(t.script.test(t.label), t.id).toBe(true);
  });

  it("has one entry per language, each with a voice and a locale", () => {
    expect(new Set(TONGUES.map((t) => t.id)).size).toBe(TONGUES.length);
    for (const t of TONGUES) expect(t.voice).toMatch(/^[a-z]{2}-IN$/);
  });

  it("uses Sarvam's code for Odia, which differs from the browser's", () => {
    expect(tongueOf("or")).toMatchObject({ locale: "or-IN", voice: "od-IN" });
  });

  it("knows which languages Saakshi's own screens use", () => {
    expect(screenLanguage("bn")).toBe("bn");
    expect(screenLanguage("ta")).toBeNull();
    expect(isTongue("ta")).toBe(true);
    expect(isTongue("xx")).toBe(false);
  });
});
