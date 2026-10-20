// Saakshi's cryptography, all in Web Crypto.
//
// - Each woman has an ECDH P-256 key pair. The public key stays usable on the phone so an SOS can
//   encrypt without her PIN; the private key is wrapped with a key derived from her vault PIN.
//   A snatched, unlocked phone can record more evidence but cannot read what was already recorded.
// - Each capture session gets an ephemeral key pair; ECDH + HKDF gives the session's AES-GCM key.
// - Fingerprints are SHA-256 of the plaintext, taken before encryption.

const enc = new TextEncoder();

export const KDF_ITERATIONS = 150_000;

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function sha256Hex(data: BufferSource): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

async function pinKey(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** A slow, salted verifier for the duress PIN. It never unlocks anything. */
export async function pinVerifier(pin: string, saltB64: string, iterations: number): Promise<string> {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromB64(saltB64), iterations },
    base,
    256,
  );
  return toB64(bits);
}

export interface KeyMaterial {
  publicKey: string; // raw P-256 point, base64
  wrappedPrivateKey: string; // iv || ciphertext, base64
  kdfSalt: string;
  kdfIterations: number;
}

export async function createKeyMaterial(pin: string, iterations = KDF_ITERATIONS): Promise<KeyMaterial> {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const salt = randomBytes(16);
  const wrapped = await wrapPrivateKey(pair.privateKey, pin, salt, iterations);
  return {
    publicKey: toB64(await crypto.subtle.exportKey("raw", pair.publicKey)),
    wrappedPrivateKey: wrapped,
    kdfSalt: toB64(salt),
    kdfIterations: iterations,
  };
}

async function wrapPrivateKey(key: CryptoKey, pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await pinKey(pin, salt, iterations), pkcs8);
  return toB64(concat(iv, new Uint8Array(ct)));
}

/** Returns her private key if the PIN is right, otherwise null. */
export async function unlockPrivateKey(material: KeyMaterial, pin: string): Promise<CryptoKey | null> {
  const blob = fromB64(material.wrappedPrivateKey);
  try {
    const key = await pinKey(pin, fromB64(material.kdfSalt), material.kdfIterations);
    const pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.subarray(0, 12) }, key, blob.subarray(12));
    // Extractable only so a PIN change can re-wrap it; it never leaves memory unwrapped.
    return await crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  } catch {
    return null;
  }
}

/** Re-wraps the private key under a new PIN. */
export async function rewrapKeyMaterial(
  material: KeyMaterial,
  privateKey: CryptoKey,
  newPin: string,
): Promise<KeyMaterial> {
  const salt = randomBytes(16);
  return {
    ...material,
    wrappedPrivateKey: await wrapPrivateKey(privateKey, newPin, salt, material.kdfIterations),
    kdfSalt: toB64(salt),
  };
}

async function importPublic(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromB64(rawB64), { name: "ECDH", namedCurve: "P-256" }, false, []);
}

async function sessionKeyFrom(privateKey: CryptoKey, publicKey: CryptoKey, sessionId: string): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdf = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode(sessionId), info: enc.encode("saakshi-session-v1") },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Starts a session: needs only her public key, so it works while the vault is locked. */
export async function openSessionForWriting(userPublicKeyB64: string, sessionId: string) {
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const key = await sessionKeyFrom(eph.privateKey, await importPublic(userPublicKeyB64), sessionId);
  const ephemeralPublicKey = toB64(await crypto.subtle.exportKey("raw", eph.publicKey));
  return { key, ephemeralPublicKey };
}

/** Recovers a session's key for reading: needs her unlocked private key. */
export async function openSessionForReading(privateKey: CryptoKey, ephemeralPublicKeyB64: string, sessionId: string) {
  return sessionKeyFrom(privateKey, await importPublic(ephemeralPublicKeyB64), sessionId);
}

/** iv || AES-GCM ciphertext */
export async function encryptPiece(key: CryptoKey, plain: BufferSource): Promise<Uint8Array<ArrayBuffer>> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return concat(iv, new Uint8Array(ct));
}

export async function decryptPiece(key: CryptoKey, blob: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.subarray(0, 12) }, key, blob.subarray(12));
}

export function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
