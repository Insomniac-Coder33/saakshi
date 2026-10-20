import { describe, expect, it } from "vitest";
import {
  createKeyMaterial,
  decryptPiece,
  encryptPiece,
  openSessionForReading,
  openSessionForWriting,
  pinVerifier,
  rewrapKeyMaterial,
  sha256Hex,
  unlockPrivateKey,
} from "./crypto";

// Fewer PBKDF2 rounds keep the tests quick; the app uses KDF_ITERATIONS.
const FAST = 100_000;

describe("crypto", () => {
  it("fingerprints match the standard SHA-256", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("unlocks only with the right PIN", async () => {
    const m = await createKeyMaterial("1931", FAST);
    expect(await unlockPrivateKey(m, "1931")).not.toBeNull();
    expect(await unlockPrivateKey(m, "1932")).toBeNull();
  });

  it("encrypts with the public key alone and decrypts with the PIN", async () => {
    const m = await createKeyMaterial("1931", FAST);
    const sessionId = crypto.randomUUID();
    const { key, ephemeralPublicKey } = await openSessionForWriting(m.publicKey, sessionId);
    const plain = crypto.getRandomValues(new Uint8Array(4096));
    const cipher = await encryptPiece(key, plain);
    expect(cipher.length).toBe(plain.length + 12 + 16);

    const priv = (await unlockPrivateKey(m, "1931"))!;
    const readKey = await openSessionForReading(priv, ephemeralPublicKey, sessionId);
    expect(new Uint8Array(await decryptPiece(readKey, cipher))).toEqual(plain);
  });

  it("detects a tampered ciphertext", async () => {
    const m = await createKeyMaterial("1931", FAST);
    const sessionId = crypto.randomUUID();
    const { key, ephemeralPublicKey } = await openSessionForWriting(m.publicKey, sessionId);
    const cipher = await encryptPiece(key, new Uint8Array([1, 2, 3]));
    cipher[20] ^= 1;
    const readKey = await openSessionForReading((await unlockPrivateKey(m, "1931"))!, ephemeralPublicKey, sessionId);
    await expect(decryptPiece(readKey, cipher)).rejects.toThrow();
  });

  it("keeps old recordings readable after a PIN change", async () => {
    const m = await createKeyMaterial("1931", FAST);
    const sessionId = crypto.randomUUID();
    const { key, ephemeralPublicKey } = await openSessionForWriting(m.publicKey, sessionId);
    const cipher = await encryptPiece(key, new Uint8Array([7, 7, 7]));

    const moved = await rewrapKeyMaterial(m, (await unlockPrivateKey(m, "1931"))!, "2468");
    expect(await unlockPrivateKey(moved, "1931")).toBeNull();
    const priv = (await unlockPrivateKey(moved, "2468"))!;
    const readKey = await openSessionForReading(priv, ephemeralPublicKey, sessionId);
    expect(new Uint8Array(await decryptPiece(readKey, cipher))).toEqual(new Uint8Array([7, 7, 7]));
  });

  it("duress verifier is deterministic per salt", async () => {
    const salt = btoa("0123456789abcdef");
    expect(await pinVerifier("0000", salt, FAST)).toBe(await pinVerifier("0000", salt, FAST));
    expect(await pinVerifier("0000", salt, FAST)).not.toBe(await pinVerifier("0001", salt, FAST));
  });
});
