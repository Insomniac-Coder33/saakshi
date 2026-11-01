// Saakshi's Android app (mobile/) runs this same web app in a WebView. There, a native "Witness"
// plugin starts a foreground service while an SOS runs, so Android lets this page keep the camera,
// microphone and location with the screen locked. In a browser none of this exists, and recording
// keeps the screen on instead (see Capture.holdScreen).

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  nativePromise?: <T>(plugin: string, method: string, options?: object) => Promise<T>;
}

function bridge(): CapacitorBridge | null {
  const cap = (globalThis as { Capacitor?: CapacitorBridge }).Capacitor;
  return cap?.isNativePlatform?.() && cap.nativePromise ? cap : null;
}

/** True inside the Android app. */
export const inAndroidApp = () => bridge() !== null;

/** Asks Android to keep this recording alive with the screen locked. False if it can't (or this is a browser). */
export async function holdWhileLocked(): Promise<boolean> {
  try {
    const result = await bridge()?.nativePromise?.<{ running: boolean }>("Witness", "start", {});
    return result?.running === true;
  } catch {
    return false;
  }
}

export async function releaseHold(): Promise<void> {
  try {
    await bridge()?.nativePromise?.("Witness", "stop", {});
  } catch {
    // Already stopped, or not in the app.
  }
}
