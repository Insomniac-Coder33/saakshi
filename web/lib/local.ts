// What Saakshi keeps on the phone, in IndexedDB.
// - "device": her setup (public key, wrapped private key, duress verifier, language). No plaintext secrets.
// - "sessions": capture sessions, kept here so a recording started offline still has its row; `dirty`
//   marks a row the server hasn't seen in its latest state.
// - "outbox": encrypted pieces waiting to upload. Each piece is written here first, so a dropped network
//   or a closed tab never loses it; the uploader drains the queue whenever it can.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { KeyMaterial } from "./crypto";

export type Language = "en" | "bn" | "hi";

export interface DeviceSetup extends KeyMaterial {
  userId: string;
  name: string;
  language: Language;
  ageGroup: "adult" | "minor";
  duressSalt: string;
  duressVerifier: string;
  createdAt: string;
}

export interface LocalSession {
  id: string;
  kind: "sos" | "journal" | "vault";
  status: "active" | "ended" | "undone";
  duress: boolean;
  ephemeralPublicKey: string;
  mime: string | null;
  title: string | null;
  startedAt: string;
  endedAt: string | null;
  dirty: boolean;
}

export interface OutboxItem {
  id: string; // `${sessionId}:${kind}:${seq}`
  sessionId: string;
  kind: "media" | "location" | "text" | "image";
  seq: number;
  segment: number; // media only: which recorder run this piece belongs to
  sha256: string;
  size: number; // plaintext size
  storagePath: string;
  capturedAt: string;
  body: Blob; // ciphertext
  attempts: number;
}

interface SaakshiDB extends DBSchema {
  device: { key: "setup"; value: DeviceSetup };
  sessions: { key: string; value: LocalSession };
  outbox: { key: string; value: OutboxItem; indexes: { bySession: string } };
}

let dbPromise: Promise<IDBPDatabase<SaakshiDB>> | null = null;

function db() {
  // Named like the disguise, so browser storage settings show nothing called Saakshi.
  dbPromise ??= openDB<SaakshiDB>("calc", 1, {
    upgrade(d) {
      d.createObjectStore("device");
      d.createObjectStore("sessions", { keyPath: "id" });
      d.createObjectStore("outbox", { keyPath: "id" }).createIndex("bySession", "sessionId");
    },
  });
  return dbPromise;
}

export async function getSetup(): Promise<DeviceSetup | undefined> {
  return (await db()).get("device", "setup");
}

export async function saveSetup(setup: DeviceSetup): Promise<void> {
  await (await db()).put("device", setup, "setup");
}

export async function clearDevice(): Promise<void> {
  const d = await db();
  await d.clear("device");
  await d.clear("sessions");
  await d.clear("outbox");
}

export async function putSession(session: LocalSession): Promise<void> {
  await (await db()).put("sessions", session);
}

export async function getSession(id: string): Promise<LocalSession | undefined> {
  return (await db()).get("sessions", id);
}

export async function localSessions(): Promise<LocalSession[]> {
  return (await db()).getAll("sessions");
}

export async function deleteLocalSession(id: string): Promise<void> {
  await (await db()).delete("sessions", id);
  await dropSession(id);
}

export async function enqueue(item: OutboxItem): Promise<void> {
  await (await db()).put("outbox", item);
}

export async function outbox(): Promise<OutboxItem[]> {
  return (await db()).getAll("outbox");
}

export async function dequeue(id: string): Promise<void> {
  await (await db()).delete("outbox", id);
}

export async function bumpAttempts(item: OutboxItem): Promise<void> {
  await (await db()).put("outbox", { ...item, attempts: item.attempts + 1 });
}

export async function dropSession(sessionId: string): Promise<void> {
  const d = await db();
  const keys = await d.getAllKeysFromIndex("outbox", "bySession", sessionId);
  await Promise.all(keys.map((k) => d.delete("outbox", k)));
}
