import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const english = env.VITE_GAME_LANGUAGE === "en" || mode === "en";
  const site = env.VITE_SITE_URL || (english && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}` : english ? "http://localhost:5173" : "https://quadra-mots.fr");
  return {
  define: { "import.meta.env.VITE_GAME_LANGUAGE": JSON.stringify(english ? "en" : "fr") },
  plugins: [
    react(),
    {
      name: "localized-metadata",
      transformIndexHtml(html) {
        if (!english) return html;
        return html.replace('lang="fr"', 'lang="en"')
          .replace("Le jeu de mots quotidien. Un tirage de quatre lettres, trois essais, un nouveau défi chaque jour.", "A daily word game. Four letters, three attempts, a new challenge every day.")
          .replace("Quadra — le jeu de mots quotidien", "Quadra — Daily word challenge")
          .replace("Un tirage de quatre lettres, trois essais, un nouveau défi chaque jour.", "Four letters, three attempts, a new challenge every day.")
          .replaceAll("https://quadra-mots.fr", new URL(site).origin);
      },
    },
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Quadra",
        short_name: "Quadra",
        description: english ? "The daily word game. Four letters, three attempts, every day." : "Le jeu de mots quotidien. Un tirage, trois essais, chaque jour.",
        lang: english ? "en" : "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#0c0b09",
        theme_color: "#0c0b09",
        icons: [
          { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // The dictionary chunk is far above the 2 MB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  };
});
