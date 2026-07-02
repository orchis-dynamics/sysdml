import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatorScript = join(packageRoot, "scripts", "generate-diagrams.mjs");

describe("@sysdml/contracts diagrams", () => {
	it("README mermaid diagrams are regenerated from source (no drift)", () => {
		expect(() =>
			execFileSync("node", [generatorScript, "--check"], {
				cwd: packageRoot,
				stdio: "pipe",
			}),
		).not.toThrow();
	});
});
