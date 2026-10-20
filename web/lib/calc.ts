// A real calculator, so the disguise holds up when someone else picks up the phone.
// Expressions are evaluated with a small precedence parser, never eval().

export type Op = "+" | "−" | "×" | "÷";
export const OPS: Op[] = ["+", "−", "×", "÷"];

export interface CalcState {
  expr: string; // what she has typed, e.g. "128×15+11"
  result: string | null; // shown after "="
  history: string; // the expression that produced `result`
}

export const initialCalc: CalcState = { expr: "", result: null, history: "" };

const isOp = (c: string): c is Op => (OPS as string[]).includes(c);

/** Evaluates "128×15+11" → 1931. Returns null for anything malformed or not finite. */
export function evaluate(expr: string): number | null {
  const tokens = expr.match(/\d*\.?\d+(?:e[+-]?\d+)?%?|[+−×÷]/g);
  if (!tokens || tokens.join("") !== expr) return null;

  let i = 0;
  const number = (): number | null => {
    let sign = 1;
    while (tokens[i] === "−" || tokens[i] === "+") {
      if (tokens[i] === "−") sign = -sign;
      i++;
    }
    const t = tokens[i++];
    if (t === undefined || isOp(t)) return null;
    const n = t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t);
    return Number.isFinite(n) ? sign * n : null;
  };
  const term = (): number | null => {
    let left = number();
    while (left !== null && (tokens[i] === "×" || tokens[i] === "÷")) {
      const op = tokens[i++];
      const right = number();
      if (right === null) return null;
      left = op === "×" ? left * right : left / right;
    }
    return left;
  };
  let value = term();
  while (value !== null && (tokens[i] === "+" || tokens[i] === "−")) {
    const op = tokens[i++];
    const right = term();
    if (right === null) return null;
    value = op === "+" ? value + right : value - right;
  }
  if (value === null || i !== tokens.length || !Number.isFinite(value)) return null;
  return value;
}

export function format(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(6).replace(/\.?0+e/, "e");
  return String(parseFloat(n.toPrecision(12)));
}

/** The last number being typed, e.g. "15" in "128×15". */
const lastNumber = (expr: string) => expr.match(/[\d.%]*$/)?.[0] ?? "";

export function press(state: CalcState, key: string): CalcState {
  // After "=", digits start fresh and operators continue from the result.
  const base = state.result !== null ? (/[\d.]/.test(key) ? "" : state.result === "Error" ? "" : state.result) : state.expr;
  const next = (expr: string): CalcState => ({ expr, result: null, history: state.result !== null ? "" : state.history });

  if (key === "AC") return initialCalc;
  if (key === "⌫") return next(base.slice(0, -1));
  if (/^\d$/.test(key)) {
    if (base.length >= 40) return state;
    const num = lastNumber(base);
    if (num.endsWith("%")) return next(base + "×" + key);
    if (num === "0") return next(base.slice(0, -1) + key);
    return next(base + key);
  }
  if (key === ".") {
    const num = lastNumber(base);
    if (num.includes(".") || num.endsWith("%")) return next(base);
    return next(base + (num === "" ? "0." : "."));
  }
  if (isOp(key)) {
    if (base === "") return key === "−" ? next("−") : next("");
    const last = base.slice(-1);
    if (isOp(last)) {
      // "5×−" is allowed for a negative operand; otherwise replace the operator.
      if (key === "−" && (last === "×" || last === "÷")) return next(base + key);
      const trimmed = base.replace(/[+−×÷]+$/, "");
      return trimmed === "" ? next("") : next(trimmed + key);
    }
    return next(base + key);
  }
  if (key === "%") {
    const num = lastNumber(base);
    if (num === "" || num.endsWith("%")) return next(base);
    return next(base + "%");
  }
  if (key === "±") {
    const num = lastNumber(base);
    if (num === "") return next(base);
    const head = base.slice(0, base.length - num.length);
    if (head.endsWith("−") && (head.length === 1 || isOp(head.slice(-2, -1)))) return next(head.slice(0, -1) + num);
    if (head === "" || isOp(head.slice(-1))) return next(head + "−" + num);
    return next(base);
  }
  if (key === "=") {
    if (state.result !== null || state.expr === "") return state;
    const value = evaluate(state.expr.replace(/[+−×÷]+$/, ""));
    return { expr: state.expr, history: state.expr, result: value === null ? "Error" : format(value) };
  }
  return state;
}

/** True when what she typed could be a PIN: 4 to 8 digits and nothing else. */
export function looksLikePin(expr: string): boolean {
  return /^\d{4,8}$/.test(expr);
}

/** Adds thousands separators to numbers of five or more digits, like a phone calculator. */
export function displayExpr(expr: string): string {
  return expr.replace(/\d+(?:\.\d*)?/g, (num) => {
    const [int, frac] = num.split(".");
    const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : int;
    return frac !== undefined ? `${grouped}.${frac}` : grouped;
  });
}
