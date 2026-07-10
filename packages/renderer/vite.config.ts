import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

import { sysdmlDev } from "./plugins/sysdml-dev.js";
import { workerInline } from "./plugins/worker-inline.js";

// The vendored `@simlin/engine` browser build loads its WASM through the
// "ESM integration proposal for Wasm" (`import * as wasm from "….wasm"`), which
// Rollup cannot handle on its own. `vite-plugin-wasm` + `vite-plugin-top-level-await`
// teach Vite to instantiate it. The import lives inside the simulation worker,
// so the plugins must also run in the dedicated `worker` build pass.
// The inlined `blob:` simulation worker (see `workerInline`) has a `blob:` base
// and the webview iframe origin, so a wasm emitted as a separate `/assets/…`
// file is fetched from the wrong origin and blocked by the webview CSP. Inlining
// it as a base64 `data:` URL drops the fetch — the engine loader decodes data
// URLs directly via `WebAssembly.instantiate`.
function wasmAssetsInlineLimit(mode: string) {
	const isVscodeBuild = mode === "vscode";
	if (!isVscodeBuild) {
		return undefined;
	}
	return (filePath: string): boolean | undefined =>
		filePath.endsWith(".wasm") ? true : undefined;
}

export default defineConfig(({ mode }) => ({
	plugins: [
		vue(),
		tailwindcss(),
		workerInline(mode === "vscode"),
		wasm(),
		topLevelAwait(),
		sysdmlDev({ file: process.env["SYSDML_FILE"] }),
	],
	worker: {
		format: "es",
		plugins: () => [wasm(), topLevelAwait()],
	},
	build: {
		outDir: mode === "vscode" ? "dist-vscode" : "dist",
		target: "esnext",
		assetsInlineLimit: wasmAssetsInlineLimit(mode),
		rollupOptions: {
			input: "index.html",
		},
	},
}));
