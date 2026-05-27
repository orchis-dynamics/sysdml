import { describe, expect, it } from "vitest";
import { runParseCommand } from "../src/parse.js";

const minimalModel = `model Test

time {
	start: 0
	end: 1
	step: 1
}

stock population {
	init: 100
}
`;

describe("runParseCommand", () => {
	it("emits AST JSON on stdout and exits 0 on a valid model", () => {
		const result = runParseCommand(minimalModel);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		const parsed = JSON.parse(result.stdout);
		expect(parsed.type).toBe("File");
	});

	it("emits diagnostics on stderr and exits 1 on syntax error", () => {
		const result = runParseCommand("model {{{");

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("--- Diagnostics ---");
	});
});
