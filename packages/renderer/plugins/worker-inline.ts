import type { Plugin } from "vite";

// Rewrites the renderer's `?worker` import to `?worker&inline`, producing a
// self-contained blob:-URL worker instead of a separately-served hashed asset.
// Two builds need this:
//   - the VS Code webview build, where the iframe origin differs from where
//     resources are served and only blob: URLs inherit the iframe origin;
//   - the published `./lib` build, because a package consumer's bundler cannot
//     serve the renderer's worker asset out of node_modules (it 404s), so the
//     library must carry the worker inline.
// Selecting the form via a build-time source rewrite (instead of a runtime
// branch) means each bundle embeds only the variant it actually uses.
export function workerInline(enabled: boolean): Plugin {
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
