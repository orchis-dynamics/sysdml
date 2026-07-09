import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function resolveNodeWasmSource(): string | undefined {
	const coLocatedWasmPath = fileURLToPath(
		new URL("./libsimlin.wasm", import.meta.url),
	);
	return existsSync(coLocatedWasmPath) ? coLocatedWasmPath : undefined;
}
