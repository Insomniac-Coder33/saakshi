import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { join } from "node:path";

// Secrets live in the repo-root .env.local (one file for the app, the contracts and the scripts).
// On Vercel they come from the project's environment variables instead.
loadEnvConfig(join(process.cwd(), ".."), process.env.NODE_ENV !== "production", console, true);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
