import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  root: "src/web",
  plugins: [svelte()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" },
  },
});
