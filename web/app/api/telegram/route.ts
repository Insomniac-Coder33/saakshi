// The guardian bot's webhook. A guardian opens t.me/<bot>?start=<invite token> and taps Start; this
// links their chat to her invite. /stop unlinks them. Nothing else they send goes anywhere.
import { adminClient } from "@/lib/admin";
import { profileOf } from "@/lib/alerts";
import { message, send, telegramReady, webhookSecret } from "@/lib/telegram";

interface Update {
  message?: { chat: { id: number; type: string }; from?: { first_name?: string }; text?: string };
}

export async function POST(request: Request) {
  if (!telegramReady() || request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return new Response(null, { status: 401 });
  }
  const update = (await request.json().catch(() => ({}))) as Update;
  // Always answer 200: Telegram re-sends anything else, and a reply that failed shouldn't loop.
  try {
    await reply(update);
  } catch (e) {
    console.error("[telegram]", e instanceof Error ? e.message : e);
  }
  return Response.json({ ok: true });
}

async function reply(update: Update) {
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== "private") return;
  const chatId = msg.chat.id;
  const db = adminClient();
  const text = msg.text.trim();

  const start = /^\/start(?:\s+([0-9a-f]{24}))?$/.exec(text);
  if (start) {
    const token = start[1];
    const { data: invite } = token
      ? await db.from("guardians").select("id, owner").eq("token", token).is("chat_id", null).maybeSingle()
      : { data: null };
    if (!invite) {
      await send(chatId, message("en", "badLink", null));
      return;
    }
    await db
      .from("guardians")
      .update({ chat_id: chatId, name: msg.from?.first_name?.slice(0, 80) ?? null, linked_at: new Date().toISOString() })
      .eq("id", invite.id);
    const { name, lang } = await profileOf(db, invite.owner);
    await send(chatId, message(lang, name ? "linked" : "linkedAnon", name));
    return;
  }

  // Anything else is answered in her language, if this chat is someone's guardian.
  const { data: linked } = await db.from("guardians").select("owner").eq("chat_id", chatId).limit(1).maybeSingle();
  const { lang } = linked ? await profileOf(db, linked.owner) : { lang: "en" as const };

  if (text === "/stop") {
    await db.from("guardians").delete().eq("chat_id", chatId);
    await send(chatId, message(lang, "stopped", null));
    return;
  }

  await send(chatId, message(lang, "onlyAlerts", null));
}
