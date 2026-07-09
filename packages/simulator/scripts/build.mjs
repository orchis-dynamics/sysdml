import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import esbuild from "esbuild";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = resolve(
	packageRoot,
	"..",
	"vendor",
	"simlin-engine",
);
const distRoot = resolve(packageRoot, "dist");

const browserWasmSourcePlugin = {
	name: "browser-wasm-source",
	setup(build) {
		build.onResolve({ filter: /wasm-source\.node(\.js)?$/ }, () => ({
			path: resolve(packageRoot, "src", "wasm-source.browser.ts"),
		}));
	},
};

const externalWasmPlugin = {
	name: "external-wasm",
	setup(build) {
		build.onResolve({ filter: /\.wasm$/ }, (args) => ({
			path: `./${args.path.split("/").pop()}`,
			external: true,
		}));
	},
};

async function buildNodeBundle() {
	await esbuild.build({
		entryPoints: [resolve(packageRoot, "src", "index.ts")],
		outfile: resolve(distRoot, "node", "index.js"),
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node24",
		conditions: ["node", "import"],
		sourcemap: false,
		logLevel: "info",
	});
	await cp(
		resolve(vendorRoot, "core", "libsimlin.wasm"),
		resolve(distRoot, "node", "libsimlin.wasm"),
	);
}

async function buildBrowserBundle() {
	await esbuild.build({
		entryPoints: [resolve(packageRoot, "src", "index.ts")],
		outfile: resolve(distRoot, "browser", "index.js"),
		bundle: true,
		platform: "browser",
		format: "esm",
		target: "esnext",
		conditions: ["browser", "module", "import"],
		plugins: [browserWasmSourcePlugin, externalWasmPlugin],
		sourcemap: false,
		logLevel: "info",
	});
	await cp(
		resolve(vendorRoot, "core", "libsimlin-browser.wasm"),
		resolve(distRoot, "browser", "libsimlin-browser.wasm"),
	);
}

async function bundleTypes() {
	const result = spawnSync(
		"pnpm",
		["exec", "dts-bundle-generator", "--config", "dts-bundle-generator.config.cjs"],
		{ cwd: packageRoot, stdio: "inherit" },
	);
	if (result.status !== 0) {
		throw new Error("dts-bundle-generator failed");
	}
}

async function copyLicenseAndProvenance() {
	const attributionDirectory = resolve(distRoot, "vendor", "simlin-engine");
	await mkdir(attributionDirectory, { recursive: true });
	await cp(
		resolve(vendorRoot, "LICENSE"),
		resolve(attributionDirectory, "LICENSE"),
	);
	await cp(
		resolve(vendorRoot, "VENDORED.md"),
		resolve(attributionDirectory, "VENDORED.md"),
	);
}

async function assertNoBareEngineSpecifier() {
	for (const relativePath of ["node/index.js", "browser/index.js"]) {
		const contents = await readFile(resolve(distRoot, relativePath), "utf8");
		if (/from\s*["']@simlin\/engine/.test(contents)) {
			throw new Error(`bare @simlin/engine specifier survived in dist/${relativePath}`);
		}
	}
}

async function main() {
	await rm(distRoot, { recursive: true, force: true });
	await buildNodeBundle();
	await buildBrowserBundle();
	await bundleTypes();
	await copyLicenseAndProvenance();
	await assertNoBareEngineSpecifier();
	await rm(resolve(distRoot, "types-check"), { recursive: true, force: true });
}

await main();
