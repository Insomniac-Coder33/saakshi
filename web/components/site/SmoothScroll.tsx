"use client";

// The showcase scrolls with a little weight (Lenis), so the long page reads like one piece. It eases the
// page's own scroll, so sticky sections and scroll-linked reveals behave as before. Not for anyone who
// asks for reduced motion, and never inside a dialog (the menu, the live demo's full view).
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.12,
      prevent: (node) => !!node.closest("dialog"),
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
