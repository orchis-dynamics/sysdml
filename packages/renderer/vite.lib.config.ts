import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

import { workerInline } from "./plugins/worker-inline.js";

const libEntry = fileURLToPath(new URL("./src/lib.ts", import.meta.url));
const styleEntry = fileURLToPath(new URL("./src/style.css", import.meta.url));

export default defineConfig({
	plugins: [
		vue(),
		tailwindcss(),
		workerInline(true),
		wasm(),
		topLevelAwait(),
		dts({
			entryRoot: "src",
			include: ["src/lib.ts", "src/SysdmlDiagram.vue"],
			outDirs: "dist/lib",
		}),
	],
	worker: {
		format: "es",
		plugins: () => [wasm(), topLevelAwait()],
	},
	build: {
		outDir: "dist/lib",
		emptyOutDir: true,
		cssCodeSplit: true,
		target: "esnext",
		lib: {
			entry: {
				lib: libEntry,
				style: styleEntry,
			},
			formats: ["es"],
			fileName: (_format, entryName) => `${entryName}.js`,
		},
		rollupOptions: {
			external: ["vue", "@unovis/ts", "@unovis/vue", "@vueuse/core"],
		},
	},
});
