const esbuild = require("esbuild");
const path = require("node:path");

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
};

const extensionConfig = {
	...sharedOptions,
	entryPoints: [path.join(__dirname, "src/extension.ts")],
	outfile: path.join(__dirname, "dist/extension.js"),
	external: ["vscode"],
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

async function run() {
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
