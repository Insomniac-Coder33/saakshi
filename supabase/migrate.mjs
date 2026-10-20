// Applies supabase/migrations/*.sql in order, once each, inside a transaction per file.
// Usage (from the repo root): node supabase/migrate.mjs
// Reads SUPABASE_DB_HOST, SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD from .env.local.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "web", "package.json"));
const { Client } = require("pg");

const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);

const client = new Client({
  host: env.SUPABASE_DB_HOST,
  port: 5432,
  database: "postgres",
  user: `postgres.${env.SUPABASE_PROJECT_REF}`,
  password: env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(`create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`);
await client.query(`alter table public._migrations enable row level security`);
const { rows } = await client.query(`select name from public._migrations`);
const applied = new Set(rows.map((r) => r.name));

const dir = join(root, "supabase", "migrations");
for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(name)) continue;
  const sql = readFileSync(join(dir, name), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(`insert into public._migrations (name) values ($1)`, [name]);
    await client.query("commit");
    console.log(`applied ${name}`);
  } catch (err) {
    await client.query("rollback");
    console.error(`failed ${name}: ${err.message}`);
    process.exitCode = 1;
    break;
  }
}
await client.end();
