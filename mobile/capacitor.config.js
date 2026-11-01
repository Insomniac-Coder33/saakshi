// The Android shell loads the live app. For a test build, SAAKSHI_APP_URL points it at a local server
// instead: run `adb reverse tcp:3100 tcp:3100` and use http://localhost:3100, which the WebView treats as
// a secure origin, so the camera and microphone work.
module.exports = {
  appId: "com.quietcalc.calculator",
  appName: "Calculator",
  webDir: "www",
  server: {
    url: process.env.SAAKSHI_APP_URL || "https://web-alpha-orcin-85.vercel.app",
    errorPath: "offline.html",
    // Only a local test server is plain http.
    cleartext: (process.env.SAAKSHI_APP_URL || "").startsWith("http://"),
  },
  android: {
    backgroundColor: "#0f0d0f",
  },
};
