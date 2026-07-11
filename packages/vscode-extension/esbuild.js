const esbuild = require("esbuild");
const path = require("node:path");
const fs = require("node:fs");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const sharedOptions = {
	bundle: true,
	platform: "node",
	target: "node20",
	format: "cjs",
	sourcemap: !production,
	minify: production,
	logLevel: "info",
	// @sysdml/simulator ships an ESM node bundle that uses `import.meta.url`
	// (for createRequire and to locate its co-located WASM). esbuild empties
	// `import.meta.url` in CJS output, so shim it to this bundle's own file
	// URL — the extension copies libsimlin.wasm next to the bundle, so the
	// simulator resolves the WASM there.
	banner: {
		js: "const importMetaUrl = require('node:url').pathToFileURL(__filename).href;",
	},
	define: {
		"import.meta.url": "importMetaUrl",
	},
};

const extensionConfig = {
	...sharedOptions,
	entryPoints: [path.join(__dirname, "src/extension.ts")],
	outfile: path.join(__dirname, "dist/extension.js"),
	external: ["vscode"],
	conditions: ["node"],
};

const lspServerEntry = path.join(
	__dirname,
	"..",
	"lsp",
	"dist",
	"src",
	"server.js",
);
const serverConfig = {
	...sharedOptions,
	entryPoints: [lspServerEntry],
	outfile: path.join(__dirname, "dist/server.js"),
	external: [],
};

function copyWasm() {
	const source = path.join(
		__dirname,
		"..",
		"vendor",
		"simlin-engine",
		"core",
		"libsimlin.wasm",
	);
	const target = path.join(__dirname, "dist", "libsimlin.wasm");
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.copyFileSync(source, target);
}

async function run() {
	copyWasm();
	if (watch) {
		const extensionContext = await esbuild.context(extensionConfig);
		const serverContext = await esbuild.context(serverConfig);
		await Promise.all([extensionContext.watch(), serverContext.watch()]);
		return;
	}
	await Promise.all([
		esbuild.build(extensionConfig),
		esbuild.build(serverConfig),
	]);
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
