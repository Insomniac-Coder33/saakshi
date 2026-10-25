// Where the disguised app lives, as seen from the showcase site (the live demo frame, the install QR).
export const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://web-alpha-orcin-85.vercel.app";

// The live demo sets itself up with these, so judges skip onboarding. Real users never see them.
export const DEMO_PIN = "1931";
export const DEMO_DURESS_PIN = "0000";
