import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { resolveWasmSource } from "../src/wasm-source.node.js";

describe("resolveWasmSource", () => {
	test("returns undefined in the source tree (no co-located libsimlin.wasm)", () => {
		const coLocated = fileURLToPath(
			new URL("../src/libsimlin.wasm", import.meta.url),
		);
		expect(existsSync(coLocated)).toBe(false);
		expect(resolveWasmSource()).toBeUndefined();
	});
});
