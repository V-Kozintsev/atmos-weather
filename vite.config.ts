import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "prompt",
    includeAssets: ["favicon.svg", "icons/*.png"],
    manifest: {
      id: "./", name: "Atmos — погода и что надеть", short_name: "Atmos",
      description: "Прогноз погоды и мужские / женские образы на час или весь день.",
      lang: "ru", start_url: "./", scope: "./", display: "standalone",
      theme_color: "#121821", background_color: "#121821",
      icons: [
        { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,woff2,json}", "outfits/*.webp", "assets/*.png"],
      navigateFallback: "index.html",
      cleanupOutdatedCaches: true,
      runtimeCaching: [],
    },
  })],
  base: "./",
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
