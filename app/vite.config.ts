import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// Режим e2e (playwright): PWA отключён, чтобы service worker не кэшировал
// между прогонами. Convex-моки больше не нужны — приложение целиком на
// PocketBase (задача K.1).
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["udacha.kdnfx.space"],
  },
  plugins: [
    react(),
    visualizer({
      filename: "dist/stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    ...(mode === "e2e"
      ? []
      : [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Задача F.2 — свой fetch-хендлер SWR для GET-запросов PocketBase.
        importScripts: ["sw-update.js"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 2592000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes("fonts.g"),
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "уДачный сад",
        short_name: "уДачный сад",
        description: "Учёт растений",
        theme_color: "#F7EFD9",
        background_color: "#F7EFD9",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        shortcuts: [
          { name: "Мои участки", short_name: "Участки", url: "/" },
          { name: "Справочник растений", short_name: "Растения", url: "/?screen=plants" },
        ],
        categories: ["lifestyle", "productivity"],
        lang: "ru",
        orientation: "portrait",
      },
    }),
        ]),
  ],
}));
