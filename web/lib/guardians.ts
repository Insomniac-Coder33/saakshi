// Her guardians, from the phone: invite links, the list, and the alerts an SOS sends them.
import { supabase } from "./supabase";

export const GUARDIAN_BOT = "Saakshi_Guardian_bot";

export interface Guardian {
  id: string;
  token: string;
  name: string | null;
  linkedAt: string | null; // null until they tap Start
  createdAt: string;
}

export const inviteLink = (token: string) => `https://t.me/${GUARDIAN_BOT}?start=${token}`;

export async function listGuardians(): Promise<Guardian[]> {
  const { data, error } = await supabase().from("guardians").select("id, token, name, linked_at, created_at").order("created_at");
  if (error) throw error;
  return (data ?? []).map((g) => ({ id: g.id, token: g.token, name: g.name, linkedAt: g.linked_at, createdAt: g.created_at }));
}

export async function inviteGuardian(): Promise<Guardian> {
  const { data, error } = await supabase().from("guardians").insert({}).select("id, token, name, linked_at, created_at").single();
  if (error) throw error;
  return { id: data.id, token: data.token, name: data.name, linkedAt: data.linked_at, createdAt: data.created_at };
}

export async function removeGuardian(id: string): Promise<void> {
  const { error } = await supabase().from("guardians").delete().eq("id", id);
  if (error) throw error;
}

export interface AlertFix {
  lat: number;
  lng: number;
  accuracy?: number;
}

/** Tells the server to alert her guardians. Resolves true once the server has it. */
export async function sendAlert(event: "start" | "location" | "duress" | "end" | "test", sessionId?: string, fix?: AlertFix | null) {
  try {
    const { data } = await supabase().auth.getSession();
    if (!data.session) return false;
    const res = await fetch("/api/alert", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ event, sessionId, fix }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
