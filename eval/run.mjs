// Runs the Sahayak evaluation set against a running Saakshi (local or live) and scores it:
// - law: the answer cites at least one of the expected laws
// - urgent: danger cases are flagged urgent
// - language: the answer is written in the language asked for
// Usage (from the repo root): node eval/run.mjs <base-url> [langs=en,bn,hi] [parallel=1]
// Signs in as a throwaway anonymous user and deletes it afterwards. Writes eval/results.json.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "web", "package.json"));
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = process.argv[2] ?? "http://localhost:3100";
const langs = (process.argv[3] ?? "en,bn,hi").split(",");
const parallel = Number(process.argv[4] ?? 1);
let stopped = false;
const { cases } = JSON.parse(readFileSync(join(root, "eval", "sahayak-eval.json"), "utf8"));

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: signedIn, error } = await sb.auth.signInAnonymously();
if (error) throw error;
const token = signedIn.session.access_token;

const SCRIPT = { en: /[A-Za-z]/, bn: /[ঀ-৿]/, hi: /[ऀ-ॿ]/ };
const inLanguage = (lang, text) => {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  const share = letters.filter((c) => SCRIPT[lang].test(c)).length / Math.max(1, letters.length);
  return share > 0.6;
};

const jobs = cases.flatMap((c) => langs.map((lang) => ({ c, lang })));
const results = [];
async function run({ c, lang }) {
  const t0 = Date.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${base}/api/sahayak`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: "ask", lang, minor: false, turns: [{ role: "user", text: c[lang] }] }),
    });
    if (res.ok) {
      const a = await res.json();
      const law = a.laws.some((id) => c.expect.includes(id));
      const urgent = c.urgent ? a.urgent === true : true;
      const language = inLanguage(lang, `${a.answer} ${a.steps.join(" ")}`);
      results.push({ id: c.id, lang, model: a.model, pass: law && urgent && language, law, urgent, language, laws: a.laws, flagged: a.urgent, ms: Date.now() - t0, answer: a.answer, steps: a.steps });
      console.log(`${law && urgent && language ? "PASS" : "FAIL"} ${c.id.padEnd(16)} ${lang}  laws=${a.laws.join(",")}${c.urgent ? ` urgent=${a.urgent}` : ""}${language ? "" : " WRONG-LANGUAGE"}  ${Date.now() - t0}ms`);
      return;
    }
    if (res.status === 429) {
      stopped = true; // Sahayak's own daily allowance: stop, and score what we have
      console.log("daily allowance reached; stopping");
      return;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  results.push({ id: c.id, lang, pass: false, error: true });
  console.log(`ERR  ${c.id} ${lang}`);
}

const queue = [...jobs];
await Promise.all(Array.from({ length: parallel }, async () => { while (queue.length && !stopped) await run(queue.shift()); }));

const by = (key) => Object.fromEntries(langs.map((l) => [l, results.filter((r) => r.lang === l)]).map(([l, rs]) => [l, `${rs.filter((r) => r[key]).length}/${rs.length}`]));
const summary = {
  models: Object.fromEntries([...new Set(results.map((r) => r.model).filter(Boolean))].map((m) => [m, results.filter((r) => r.model === m).length])),
  ranAt: new Date().toISOString(),
  questions: results.length,
  pass: `${results.filter((r) => r.pass).length}/${results.length}`,
  passByLanguage: by("pass"),
  correctLawByLanguage: by("law"),
  urgentFlagged: `${results.filter((r) => cases.find((c) => c.id === r.id)?.urgent && r.flagged).length}/${results.filter((r) => cases.find((c) => c.id === r.id)?.urgent).length}`,
  medianMs: results.map((r) => r.ms).filter(Boolean).sort((a, b) => a - b)[Math.floor(results.length / 2)],
};
writeFileSync(join(root, "eval", "results.json"), JSON.stringify({ summary, results }, null, 2));
console.log("\n", summary);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
await admin.auth.admin.deleteUser(signedIn.user.id);
