import { describe, expect, it } from "vitest";
import { evaluate, format, initialCalc, looksLikePin, press, type CalcState } from "./calc";

const type = (keys: string, from: CalcState = initialCalc) =>
  [...keys].reduce((s, k) => press(s, k === "*" ? "×" : k === "/" ? "÷" : k === "-" ? "−" : k), from);

describe("evaluate", () => {
  it("respects precedence", () => {
    expect(evaluate("128×15+11")).toBe(1931);
    expect(evaluate("2+3×4")).toBe(14);
    expect(evaluate("10−4−3")).toBe(3);
    expect(evaluate("8÷4÷2")).toBe(1);
  });
  it("handles negatives and percent", () => {
    expect(evaluate("−5×3")).toBe(-15);
    expect(evaluate("5×−3")).toBe(-15);
    expect(evaluate("50%")).toBe(0.5);
    expect(evaluate("200×10%")).toBe(20);
  });
  it("rejects nonsense", () => {
    expect(evaluate("5×")).toBeNull();
    expect(evaluate("1÷0")).toBeNull();
    expect(evaluate("abc")).toBeNull();
  });
});

describe("press", () => {
  it("computes like a phone calculator", () => {
    const s = type("128*15+11=");
    expect(s.result).toBe("1931");
    expect(s.history).toBe("128×15+11");
  });
  it("continues from a result with an operator, starts fresh with a digit", () => {
    expect(type("+1=", type("2+2=")).result).toBe("5");
    expect(type("7", type("2+2=")).expr).toBe("7");
  });
  it("replaces a repeated operator", () => {
    expect(type("5+*2=").result).toBe("10");
  });
  it("shows Error for division by zero and recovers", () => {
    const s = type("1/0=");
    expect(s.result).toBe("Error");
    expect(type("3=", s).result).toBe("3");
  });
  it("avoids floating-point noise", () => {
    expect(type("0.1+0.2=").result).toBe("0.3");
    expect(format(1 / 3)).toBe("0.333333333333");
  });
  it("toggles sign of the current number", () => {
    expect(press(type("5+3"), "±").expr).toBe("5+−3");
    expect(press(press(type("5+3"), "±"), "±").expr).toBe("5+3");
  });
});

describe("looksLikePin", () => {
  it("accepts 4 to 8 bare digits only", () => {
    expect(looksLikePin("1931")).toBe(true);
    expect(looksLikePin("12345678")).toBe(true);
    expect(looksLikePin("123")).toBe(false);
    expect(looksLikePin("123456789")).toBe(false);
    expect(looksLikePin("19+31")).toBe(false);
  });
});
