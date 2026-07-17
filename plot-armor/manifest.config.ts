import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

// AniList GraphQL endpoint + OAuth, Reddit surfaces, and the classifier proxy.
// The proxy origin is a placeholder until Phase 3 picks a host (Vercel/Workers).
export default defineManifest({
  manifest_version: 3,
  name: "PlotArmor — Anime Spoiler Blocker",
  version: pkg.version,
  description:
    "Blurs anime spoilers for shows you're still watching, based on your AniList progress.",
  icons: {
    16: "icons/icon.png",
    48: "icons/icon.png",
    128: "icons/icon.png",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_icon: "icons/icon.png",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["storage", "identity", "alarms"],
  host_permissions: [
    "https://graphql.anilist.co/",
    "https://www.reddit.com/*",
    "https://old.reddit.com/*",
    // Classifier proxy — replaced with the real deployment in Phase 3.
    "https://plotarmor-proxy.example.workers.dev/*",
  ],
  content_scripts: [
    {
      matches: [
        "https://www.reddit.com/r/*/comments/*",
        "https://old.reddit.com/r/*/comments/*",
      ],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
});
