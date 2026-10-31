import { describe, expect, it } from "vitest";
import { approvalsNeeded, codeIn, newCode, packDecision, spaced, unpackDecision } from "./recovery";

describe("recovery codes", () => {
  it("reads a code however a guardian types it", () => {
    expect(codeIn("482913")).toBe("482913");
    expect(codeIn("482 913")).toBe("482913");
    expect(codeIn(" /recover 482913 ")).toBe("482913");
    expect(codeIn("/recover482 913")).toBe("482913");
  });

  it("ignores anything that isn't exactly six digits", () => {
    for (const text of ["48291", "4829134", "hello 482913", "48-29-13", "/start 482913", ""]) expect(codeIn(text)).toBeNull();
  });

  it("makes six-digit codes, spaced for reading aloud", () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^\d{6}$/);
    expect(spaced("012345")).toBe("012 345");
  });
});

describe("approve and decline buttons", () => {
  const rec = "3f2b8c1e-9a7d-4e21-8b0c-5d6e7f809a1b";
  const guardian = "a1b2c3d4-e5f6-4789-90ab-cdef01234567";

  it("pack both ids into Telegram's 64-byte limit and back", () => {
    for (const approve of [true, false]) {
      const data = packDecision(approve, rec, guardian);
      expect(data.length).toBeLessThanOrEqual(64);
      expect(unpackDecision(data)).toEqual({ approve, recoveryId: rec, guardianId: guardian });
    }
  });

  it("reject anything else", () => {
    expect(unpackDecision("hello")).toBeNull();
    expect(unpackDecision("x" + "A".repeat(43))).toBeNull();
    expect(unpackDecision("y" + "A".repeat(42))).toBeNull();
  });
});

describe("how many guardians must approve", () => {
  it("is two, or her only one", () => {
    expect(approvalsNeeded(0)).toBe(1);
    expect(approvalsNeeded(1)).toBe(1);
    expect(approvalsNeeded(2)).toBe(2);
    expect(approvalsNeeded(5)).toBe(2);
  });
});
