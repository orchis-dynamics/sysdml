import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { sysdmlDev } from "./plugins/sysdml-dev.js";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    sysdmlDev({ file: process.env["SYSDML_FILE"] }),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
    },
  },
});
