import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-01-01",
	ssr: true,
	css: ["~/assets/css/main.css"],
	build: {
		transpile: ["@sysdml/renderer"],
	},
	vite: {
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
