import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

import { sysdmlDev } from "./plugins/sysdml-dev.js";

// In VS Code webviews the iframe origin (`vscode-webview://[guid]`) is
// different from where resources are served (`https://file+.vscode-cdn.net`).
// Worker constructors enforce same-origin against the script URL, and only
// blob: URLs inherit the iframe origin. So for the VS Code build we rewrite
// the renderer's `?worker` import to `?worker&inline` (which produces a
// blob:-URL worker). Hosted single-origin deployments (e.g. the future Monaco
// web demo) keep the cleaner `?worker` form. Selecting the form via build-
// time source rewrite (instead of a runtime branch or static `?` flag pair)
// means each bundle embeds only the variant it actually uses.
function workerInline(mode: string): Plugin {
	const enabled = mode === "vscode";
	return {
		name: "sysdml-worker-inline-select",
		enforce: "pre",
		transform(code, id) {
			if (!enabled) return null;
			if (!id.endsWith("/simulation/client.ts")) return null;
			const replaced = code.replace(
				/(["'])\.\/worker\.ts\?worker\1/,
				"$1./worker.ts?worker&inline$1",
			);
			if (replaced === code) return null;
			return { code: replaced, map: null };
		},
	};
}

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
		workerInline(mode),
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
