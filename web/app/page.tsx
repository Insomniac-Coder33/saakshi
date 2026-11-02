import { App } from "@/components/App";

// On a phone the app is the whole screen; on a computer it sits in a phone-sized frame (globals.css).
export default function Page() {
  return (
    <div className="app-stage">
      <div className="app-frame">
        <App />
      </div>
    </div>
  );
}
