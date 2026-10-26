// Server only. Sends guardian alerts for an SOS and keeps each guardian's live-location map moving.
// Her location passes through here on its way to Telegram and is never stored.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "./local";
import { message, send, tg, TelegramError } from "./telegram";

export type AlertEvent = "start" | "location" | "duress" | "end";

export interface Fix {
  lat: number;
  lng: number;
  accuracy?: number;
}

const LIVE_SECONDS = 8 * 3600;

interface Guardian {
  id: string;
  chat_id: number;
}
interface AlertRow {
  id: number;
  guardian_id: string;
  location_message_id: number | null;
  duress_at: string | null;
  silent_at: string | null;
  ended_at: string | null;
  guardians: { chat_id: number | null } | null;
}

export async function profileOf(db: SupabaseClient, owner: string): Promise<{ name: string | null; lang: Language }> {
  const { data } = await db.from("profiles").select("display_name, language").eq("id", owner).maybeSingle();
  return { name: data?.display_name ?? null, lang: (data?.language as Language) ?? "en" };
}

export async function linkedGuardians(db: SupabaseClient, owner: string): Promise<Guardian[]> {
  const { data } = await db.from("guardians").select("id, chat_id").eq("owner", owner).not("chat_id", "is", null);
  return (data ?? []) as Guardian[];
}

async function alertRows(db: SupabaseClient, sessionId: string): Promise<AlertRow[]> {
  const { data } = await db
    .from("alerts")
    .select("id, guardian_id, location_message_id, duress_at, silent_at, ended_at, guardians(chat_id)")
    .eq("session_id", sessionId)
    .overrideTypes<AlertRow[]>();
  return (data ?? []).filter((r) => r.guardians?.chat_id);
}

function liveLocation(chatId: number, fix: Fix) {
  return tg<{ message_id: number }>("sendLocation", {
    chat_id: chatId,
    latitude: fix.lat,
    longitude: fix.lng,
    horizontal_accuracy: fix.accuracy ? Math.min(1500, Math.max(0, fix.accuracy)) : undefined,
    live_period: LIVE_SECONDS,
  });
}

/** Each step for each guardian is tried on its own: one blocked chat must not stop the others. */
async function each<T>(items: T[], fn: (item: T) => Promise<void>) {
  await Promise.all(items.map((i) => fn(i).catch((e) => console.error("[alert]", e instanceof Error ? e.message : e))));
}

/** The SOS has started (and wasn't undone): tell every linked guardian, once. */
async function start(db: SupabaseClient, owner: string, sessionId: string, fix: Fix | null) {
  const { name, lang } = await profileOf(db, owner);
  const guardians = await linkedGuardians(db, owner);
  const already = new Set((await alertRows(db, sessionId)).map((r) => r.guardian_id));
  await each(
    guardians.filter((g) => !already.has(g.id)),
    async (g) => {
      // Claim the row first, so a retry from the phone can't alert anyone twice.
      const { data: row } = await db.from("alerts").insert({ session_id: sessionId, guardian_id: g.id }).select("id").maybeSingle();
      if (!row) return;
      await send(g.chat_id, message(lang, "start", name));
      if (fix) {
        const m = await liveLocation(g.chat_id, fix);
        await db.from("alerts").update({ location_message_id: m.message_id }).eq("id", row.id);
      } else {
        await send(g.chat_id, message(lang, "noFix", name));
      }
    },
  );
}

async function moveLocation(db: SupabaseClient, sessionId: string, fix: Fix) {
  await each(
    (await alertRows(db, sessionId)).filter((r) => !r.ended_at),
    async (r) => {
      const chatId = r.guardians!.chat_id!;
      if (r.location_message_id) {
        try {
          await tg("editMessageLiveLocation", {
            chat_id: chatId,
            message_id: r.location_message_id,
            latitude: fix.lat,
            longitude: fix.lng,
            horizontal_accuracy: fix.accuracy ? Math.min(1500, Math.max(0, fix.accuracy)) : undefined,
          });
          return;
        } catch (e) {
          if (e instanceof TelegramError && /not modified/i.test(e.description)) return;
          // The live period ran out or the message was deleted: start a new map below.
        }
      }
      const m = await liveLocation(chatId, fix);
      await db.from("alerts").update({ location_message_id: m.message_id }).eq("id", r.id);
    },
  );
}

async function duress(db: SupabaseClient, owner: string, sessionId: string) {
  const { name, lang } = await profileOf(db, owner);
  await each(
    (await alertRows(db, sessionId)).filter((r) => !r.duress_at && !r.ended_at),
    async (r) => {
      await db.from("alerts").update({ duress_at: new Date().toISOString() }).eq("id", r.id);
      await send(r.guardians!.chat_id!, message(lang, "duress", name));
    },
  );
}

export async function end(db: SupabaseClient, owner: string, sessionId: string) {
  const { name, lang } = await profileOf(db, owner);
  await each(
    (await alertRows(db, sessionId)).filter((r) => !r.ended_at),
    async (r) => {
      const chatId = r.guardians!.chat_id!;
      await db.from("alerts").update({ ended_at: new Date().toISOString() }).eq("id", r.id);
      if (r.location_message_id) await tg("stopMessageLiveLocation", { chat_id: chatId, message_id: r.location_message_id }).catch(() => {});
      await send(chatId, message(lang, "end", name));
    },
  );
}

export async function handle(db: SupabaseClient, owner: string, sessionId: string, event: AlertEvent, fix: Fix | null) {
  if (event === "start") return start(db, owner, sessionId, fix);
  if (event === "location") return fix ? moveLocation(db, sessionId, fix) : undefined;
  if (event === "duress") {
    // A duress PIN typed on the calculator can be the very first thing guardians hear about.
    await start(db, owner, sessionId, fix);
    return duress(db, owner, sessionId);
  }
  return end(db, owner, sessionId);
}

const SILENT_AFTER_S = 90;

/**
 * Run by the once-a-minute cron. An SOS whose phone has gone quiet (switched off, taken, broken)
 * gets one "her phone stopped sending" message; one that ended without saying so gets its end message.
 */
export async function watchSilentPhones(db: SupabaseClient) {
  const { data } = await db
    .from("alerts")
    .select("id, session_id, silent_at, location_message_id, guardians(chat_id), sessions(owner, status)")
    .is("ended_at", null)
    .overrideTypes<{ id: number; session_id: string; silent_at: string | null; location_message_id: number | null; guardians: { chat_id: number | null } | null; sessions: { owner: string; status: string } | null }[]>();
  const bySession = new Map<string, NonNullable<typeof data>>();
  for (const r of data ?? []) bySession.set(r.session_id, [...(bySession.get(r.session_id) ?? []), r]);

  for (const [sessionId, rows] of bySession) {
    const s = rows[0].sessions;
    if (!s) continue;
    if (s.status !== "active") {
      await end(db, s.owner, sessionId);
      continue;
    }
    const waiting = rows.filter((r) => !r.silent_at && r.guardians?.chat_id);
    if (!waiting.length) continue;
    const { data: last } = await db
      .from("pieces")
      .select("received_at")
      .eq("session_id", sessionId)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: alerted } = await db.from("alerts").select("started_at").eq("session_id", sessionId).order("started_at").limit(1).maybeSingle();
    const lastAt = new Date(last?.received_at ?? alerted?.started_at ?? Date.now());
    if (Date.now() - lastAt.getTime() < SILENT_AFTER_S * 1000) continue;
    const { name, lang } = await profileOf(db, s.owner);
    await each(waiting, async (r) => {
      await db.from("alerts").update({ silent_at: new Date().toISOString() }).eq("id", r.id);
      await send(r.guardians!.chat_id!, message(lang, "silent", name, lastAt));
    });
  }
}
