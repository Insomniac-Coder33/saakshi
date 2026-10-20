// Creating, unlocking and erasing her Saakshi.
import { createKeyMaterial, pinVerifier, randomBytes, rewrapKeyMaterial, toB64, unlockPrivateKey } from "./crypto";
import { clearDevice, getSetup, saveSetup, type DeviceSetup, type Language } from "./local";
import { ensureUser, SESSION_STORAGE_KEY, supabase } from "./supabase";

export interface SetupInput {
  name: string;
  language: Language;
  ageGroup: "adult" | "minor";
  pin: string;
  duressPin: string;
}

export async function createSetup(input: SetupInput): Promise<DeviceSetup> {
  const userId = await ensureUser();
  const material = await createKeyMaterial(input.pin);
  const duressSalt = toB64(randomBytes(16));
  const duressVerifier = await pinVerifier(input.duressPin, duressSalt, material.kdfIterations);

  const { error } = await supabase()
    .from("profiles")
    .upsert({
      id: userId,
      display_name: input.name || null,
      language: input.language,
      age_group: input.ageGroup,
      public_key: material.publicKey,
      wrapped_private_key: material.wrappedPrivateKey,
      kdf_salt: material.kdfSalt,
      kdf_iterations: material.kdfIterations,
    });
  if (error) throw error;

  const setup: DeviceSetup = {
    ...material,
    userId,
    name: input.name,
    language: input.language,
    ageGroup: input.ageGroup,
    duressSalt,
    duressVerifier,
    createdAt: new Date().toISOString(),
  };
  await saveSetup(setup);
  return setup;
}

export type PinResult = { kind: "vault"; privateKey: CryptoKey } | { kind: "duress" } | { kind: "none" };

/** Checks a PIN typed on the calculator against both her PIN and her duress PIN. */
export async function checkPin(setup: DeviceSetup, pin: string): Promise<PinResult> {
  const [privateKey, verifier] = await Promise.all([
    unlockPrivateKey(setup, pin),
    pinVerifier(pin, setup.duressSalt, setup.kdfIterations),
  ]);
  if (privateKey) return { kind: "vault", privateKey };
  if (verifier === setup.duressVerifier) return { kind: "duress" };
  return { kind: "none" };
}

export async function changePin(setup: DeviceSetup, privateKey: CryptoKey, newPin: string): Promise<DeviceSetup> {
  const material = await rewrapKeyMaterial(setup, privateKey, newPin);
  const { error } = await supabase()
    .from("profiles")
    .update({ wrapped_private_key: material.wrappedPrivateKey, kdf_salt: material.kdfSalt })
    .eq("id", setup.userId);
  if (error) throw error;
  const next = { ...setup, ...material };
  await saveSetup(next);
  return next;
}

export async function changeDuressPin(setup: DeviceSetup, newPin: string): Promise<DeviceSetup> {
  const duressSalt = toB64(randomBytes(16));
  const next = { ...setup, duressSalt, duressVerifier: await pinVerifier(newPin, duressSalt, setup.kdfIterations) };
  await saveSetup(next);
  return next;
}

export async function updatePreferences(setup: DeviceSetup, prefs: Partial<Pick<DeviceSetup, "language" | "name">>) {
  const next = { ...setup, ...prefs };
  await saveSetup(next);
  await supabase()
    .from("profiles")
    .update({ language: next.language, display_name: next.name || null })
    .eq("id", setup.userId);
  return next;
}

/** Erasure: every recording, her keys and her account, on the server and on this phone. */
export async function eraseEverything(): Promise<void> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) {
    // The server removes her storage objects, then her account; every table cascades from it.
    const res = await fetch("/api/erase", {
      method: "POST",
      headers: { authorization: `Bearer ${data.session.access_token}` },
    });
    if (!res.ok) throw new Error("The server couldn’t erase your account. Check your connection and try again.");
    // The account no longer exists, so a server sign-out would be refused; drop the local session.
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
  await clearDevice();
}

export { getSetup };
