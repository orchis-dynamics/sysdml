import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";

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

export default defineConfig(({ mode }) => ({
	plugins: [
		vue(),
		tailwindcss(),
		workerInline(mode),
		sysdmlDev({ file: process.env["SYSDML_FILE"] }),
	],
	build: {
		outDir: "dist",
		target: "esnext",
		rollupOptions: {
			input: "index.html",
		},
	},
}));
