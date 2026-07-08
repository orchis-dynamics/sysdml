import { fileURLToPath } from "node:url";

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";

const isDev = process.env.NODE_ENV !== "production";

export default defineNuxtConfig({
	compatibilityDate: "2025-01-01",
	ssr: true,
	css: ["~/assets/css/main.css"],
	build: {
		transpile: ["@sysdml/renderer"],
	},
	vite: {
		resolve: {
			alias: isDev
				? {
						"@sysdml/renderer/lib": fileURLToPath(
							new URL("../renderer/src/lib.ts", import.meta.url),
						),
					}
				: {},
		},
		build: {
			target: "esnext",
		},
		plugins: [wasm(), topLevelAwait(), tailwindcss()],
		worker: {
			format: "es",
			plugins: () => [wasm(), topLevelAwait()],
		},
		optimizeDeps: {
			exclude: ["@sysdml/renderer", "@simlin/engine"],
		},
	},
});
