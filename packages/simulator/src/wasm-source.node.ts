import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Replaced with `true` by esbuild's `define` in the published node bundle; left
// undefined when running the source tree under vitest/tsc.
declare const __SYSDML_SIMULATOR_BUNDLED__: boolean | undefined;

function isBundledRuntime(): boolean {
	return (
		typeof __SYSDML_SIMULATOR_BUNDLED__ !== "undefined" &&
		__SYSDML_SIMULATOR_BUNDLED__
	);
}

export function resolveWasmSource(): string | undefined {
	const coLocatedWasmPath = fileURLToPath(
		new URL("./libsimlin.wasm", import.meta.url),
	);
	if (existsSync(coLocatedWasmPath)) {
		return coLocatedWasmPath;
	}
	if (isBundledRuntime()) {
		throw new Error(
			`@sysdml/simulator: the bundled Simlin WASM was not found next to the runtime at ${coLocatedWasmPath}. The installed package may be incomplete, or the bundle was relocated without copying libsimlin.wasm alongside it.`,
		);
	}
	return undefined;
}
