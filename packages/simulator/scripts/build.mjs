import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import esbuild from "esbuild";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = resolve(packageRoot, "..", "vendor", "simlin-engine");
const distRoot = resolve(packageRoot, "dist");

const browserWasmSourcePlugin = {
	name: "browser-wasm-source",
	setup(build) {
		build.onResolve({ filter: /wasm-source\.node(\.js)?$/ }, () => ({
			path: resolve(packageRoot, "src", "wasm-source.browser.ts"),
		}));
	},
};

const browserWasmFilename = "libsimlin-browser.wasm";

const externalWasmPlugin = {
	name: "external-wasm",
	setup(build) {
		build.onResolve({ filter: /\.wasm$/ }, (args) => {
			const importedWasmFilename = args.path.split("/").pop();
			if (importedWasmFilename !== browserWasmFilename) {
				throw new Error(
					`external-wasm: unexpected WASM import '${args.path}'. buildBrowserBundle only copies '${browserWasmFilename}' into dist/browser; a new engine WASM asset must be copied there and allowed here before it can be externalized.`,
				);
			}
			return { path: `./${importedWasmFilename}`, external: true };
		});
	},
};

const workerBackendStubPlugin = {
	name: "worker-backend-stub",
	setup(build) {
		build.onResolve(
			{ filter: /^@simlin\/engine\/internal\/backend-factory$/ },
			() => ({
				path: resolve(packageRoot, "src", "simlin-worker-backend-stub.ts"),
			}),
		);
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
		define: {
			__SYSDML_SIMULATOR_BUNDLED__: "true",
		},
		banner: {
			js: [
				"import { createRequire as createNodeRequire } from 'node:module';",
				"const require = createNodeRequire(import.meta.url);",
			].join("\n"),
		},
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
		plugins: [
			browserWasmSourcePlugin,
			externalWasmPlugin,
			workerBackendStubPlugin,
		],
		sourcemap: false,
		logLevel: "info",
	});
	await cp(
		resolve(vendorRoot, "core", browserWasmFilename),
		resolve(distRoot, "browser", browserWasmFilename),
	);
}

async function bundleTypes() {
	const result = spawnSync(
		"pnpm",
		[
			"exec",
			"dts-bundle-generator",
			"--config",
			"dts-bundle-generator.config.cjs",
		],
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
			throw new Error(
				`bare @simlin/engine specifier survived in dist/${relativePath}`,
			);
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
