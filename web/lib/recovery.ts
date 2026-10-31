// Server only. Moving her Saakshi to a new phone (see migration 0009): her guardians approve on
// Telegram, then the new phone is signed in to her account and the old one is signed out.
// Her recordings stay locked with her PIN the whole time, so approving can't open them.
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { profileOf } from "./alerts";
import { editText, message, send, sendButtons } from "./telegram";

/** How long a code stays usable, and how long an approved request can still be claimed. */
export const CODE_MINUTES = 30;

/** Two of her guardians must approve, or her only one. */
export const approvalsNeeded = (linkedGuardians: number) => Math.max(1, Math.min(2, linkedGuardians));

/** "482 913", "482913" or "/recover 482913": the six digits, or null. */
export function codeIn(text: string): string | null {
  const m = /^(?:\/recover\s*)?(\d{3})\s?(\d{3})$/.exec(text.trim());
  return m ? m[1] + m[2] : null;
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

// A button's data is at most 64 bytes, so the request and guardian ids travel packed: y|n + 32 bytes, base64url.
export function packDecision(approve: boolean, recoveryId: string, guardianId: string): string {
  const bytes = Buffer.from((recoveryId + guardianId).replaceAll("-", ""), "hex");
  return (approve ? "y" : "n") + bytes.toString("base64url");
}

export function unpackDecision(data: string): { approve: boolean; recoveryId: string; guardianId: string } | null {
  if (!/^[yn][A-Za-z0-9_-]{43}$/.test(data)) return null;
  const hex = Buffer.from(data.slice(1), "base64url").toString("hex");
  if (hex.length !== 64) return null;
  const uuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  return { approve: data[0] === "y", recoveryId: uuid(hex.slice(0, 32)), guardianId: uuid(hex.slice(32)) };
}

export const expired = (row: { expires_at: string }) => Date.parse(row.expires_at) < Date.now();

/** The address a sign-in token is made for during a move. It is never mailed; .invalid can't be delivered. */
export const recoveryEmail = (owner: string) => `${owner}@recovery.saakshi.invalid`;

export async function linkedCount(db: SupabaseClient, owner: string): Promise<number> {
  const { count } = await db.from("guardians").select("id", { count: "exact", head: true }).eq("owner", owner).not("chat_id", "is", null);
  return count ?? 0;
}

interface Recovery {
  id: string;
  requester: string;
  owner: string | null;
  status: string;
  expires_at: string;
}

/** A guardian sent a code to the bot: ask them, about her by name, to approve or decline. */
export async function askGuardian(db: SupabaseClient, chatId: number, code: string): Promise<void> {
  const { data: mine } = await db.from("guardians").select("id, owner").eq("chat_id", chatId);
  if (!mine?.length) {
    await send(chatId, message("en", "onlyAlerts", null));
    return;
  }
  const { data: rec } = await db.from("recoveries").select("id, requester, owner, status, expires_at").eq("code", code).eq("status", "open").maybeSingle<Recovery>();
  // Only her own guardians are asked. Anyone else hears that no request matches, so a code reveals nothing.
  const asked = rec && !expired(rec) ? mine.filter((g) => (rec.owner ? g.owner === rec.owner : g.owner !== rec.requester)) : [];
  if (!rec || !asked.length) {
    const { lang } = await profileOf(db, mine[0].owner);
    await send(chatId, message(lang, "recoverNoCode", null));
    return;
  }
  for (const g of asked) {
    const { name, lang } = await profileOf(db, g.owner);
    await sendButtons(chatId, message(lang, "recoverAsk", name, new Date(), spaced(code)), [
      { text: message(lang, "approve", name), data: packDecision(true, rec.id, g.id) },
      { text: message(lang, "decline", name), data: packDecision(false, rec.id, g.id) },
    ]);
  }
}

/** A guardian tapped Approve or Decline. The first approval fixes whose account the request is for. */
export async function decide(
  db: SupabaseClient,
  chatId: number,
  data: string,
  shown: { chatId: number; messageId: number } | undefined,
): Promise<void> {
  const d = unpackDecision(data);
  if (!d) return;
  const { data: g } = await db.from("guardians").select("id, owner").eq("id", d.guardianId).eq("chat_id", chatId).maybeSingle();
  if (!g) return; // not this chat's guardian row: ignore
  const { name, lang } = await profileOf(db, g.owner);
  const say = async (key: "recoverApproved" | "recoverApprovedWait" | "recoverDeclined" | "recoverClosed") => {
    const text = message(lang, key, name);
    if (shown) await editText(shown.chatId, shown.messageId, text).catch(() => send(chatId, text));
    else await send(chatId, text);
  };

  const { data: rec } = await db.from("recoveries").select("id, requester, owner, status, expires_at").eq("id", d.recoveryId).maybeSingle<Recovery>();
  if (!rec || rec.status !== "open" || expired(rec) || rec.requester === g.owner || (rec.owner && rec.owner !== g.owner)) {
    return say("recoverClosed");
  }
  if (!d.approve) {
    await db.from("recoveries").update({ status: "declined" }).eq("id", rec.id).eq("status", "open");
    return say("recoverDeclined");
  }
  if (!rec.owner) {
    const { data: bound } = await db.from("recoveries").update({ owner: g.owner }).eq("id", rec.id).is("owner", null).select("id").maybeSingle();
    if (!bound) {
      // Another guardian bound it first; carry on only if it was for the same woman.
      const { data: now } = await db.from("recoveries").select("owner").eq("id", rec.id).maybeSingle();
      if (now?.owner !== g.owner) return say("recoverClosed");
    }
  }
  await db.from("recovery_approvals").upsert({ recovery_id: rec.id, guardian_id: g.id }, { onConflict: "recovery_id,guardian_id", ignoreDuplicates: true });
  const { count } = await db.from("recovery_approvals").select("guardian_id", { count: "exact", head: true }).eq("recovery_id", rec.id);
  if ((count ?? 0) >= approvalsNeeded(await linkedCount(db, g.owner))) {
    await db.from("recoveries").update({ status: "approved" }).eq("id", rec.id).eq("status", "open");
    return say("recoverApproved");
  }
  return say("recoverApprovedWait");
}
