import type { MetadataRoute } from "next";

// The home-screen disguise: an ordinary calculator. Never put the Saakshi name or mark here.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calculator",
    short_name: "Calculator",
    description: "Calculator",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0d0f",
    theme_color: "#0f0d0f",
    categories: ["utilities"],
    icons: [
      { src: "/icons/calculator-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/calculator-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/calculator-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
