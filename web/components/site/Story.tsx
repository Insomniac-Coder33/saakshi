"use client";

// "One night": the story told beside a phone that holds still while the screens change.
// On narrow screens each step carries its own screenshot instead.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Phone, Screenshot } from "./Phone";

// Technical names stay on one line.
const Term = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap">{children}</span>;

const STEPS: { time: string; title: string; body: ReactNode; shot: string; alt: string; tone: "light" | "dark"; fade?: boolean }[] = [
  {
    time: "9:41 pm",
    title: "It looks like a calculator. It is one.",
    body: "Every key works. Its home-screen name and icon say Calculator, and so do the page title, browser storage and offline cache. Only her PIN followed by = opens Saakshi.",
    shot: "/site/calculator.webp",
    alt: "The calculator",
    tone: "dark",
    fade: false,
  },
  {
    time: "9:47 pm",
    title: "Three taps. Nobody sees a thing.",
    body: "She taps the display three times. The screen turns plum, then black. Camera, microphone and location keep recording while the screen stays awake and dark.",
    shot: "/site/sos.webp",
    alt: "The silent SOS screen",
    tone: "dark",
  },
  {
    time: "9:47:06 pm",
    title: "Every five seconds, out of reach.",
    body: (
      <>
        Each 5-second piece is fingerprinted with <Term>SHA-256</Term> and encrypted with <Term>AES-GCM</Term> on her phone, then uploaded at
        once. Snatch the phone and you get, at most, the last five seconds.
      </>
    ),
    shot: "/site/sealed.webp",
    alt: "The SOS screen showing pieces sealed",
    tone: "dark",
  },
  {
    time: "9:52 pm",
    title: "If he makes her stop, she can pretend.",
    body: "A second, duress PIN makes it look as if recording stopped. It didn’t. It carries on, and the recording is flagged so she knows which night it was.",
    shot: "/site/duress.webp",
    alt: "The vault: two sealed recordings, one stopped with the duress PIN",
    tone: "light",
  },
  {
    time: "Next morning",
    title: "Sealed. Shown. Checked.",
    body: "Every piece was anchored on Polygon within a minute of being recorded. She shows the QR code, and anyone can check the file hasn’t changed by a single byte. No account, no trust in us required.",
    shot: "/site/proof.webp",
    alt: "A sealed recording with its verify QR code",
    tone: "light",
  },
];

export function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-16 lg:grid-cols-[1fr_340px] lg:gap-24">
      <ol>
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="flex flex-col justify-center lg:min-h-[62vh] border-t border-hairline py-14 first:border-0 lg:py-0"
          >
            <p className="label">{s.time}</p>
            <h3 className={`mt-3 font-display text-[40px] leading-[1.05] transition-colors duration-500 md:text-[52px] ${active === i ? "text-ink" : "lg:text-ink/30"}`}>
              {s.title}
            </h3>
            <p className="mt-5 max-w-[34rem] text-[18px] leading-[1.6] text-muted">{s.body}</p>
            <Phone className="mx-auto mt-10 w-[260px] lg:hidden">
              <Screenshot src={s.shot} alt={s.alt} tone={s.tone} fade={s.fade} />
            </Phone>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-[calc(50vh-370px)]">
          <Phone className="w-[340px]">
            {STEPS.map((s, i) => (
              <div key={s.shot} className={`absolute inset-0 transition-opacity duration-700 ${active === i ? "opacity-100" : "opacity-0"}`}>
                <Screenshot src={s.shot} alt={s.alt} tone={s.tone} fade={s.fade} />
              </div>
            ))}
          </Phone>
          <div className="mt-6 flex justify-center gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <i key={s.shot} className={`h-1.5 rounded-full transition-all duration-500 ${active === i ? "w-6 bg-rani" : "w-1.5 bg-hairline"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
