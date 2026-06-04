import { describe, expect, it } from "vitest";

import { runPipeline } from "../src/pipeline.js";

const minimalModel = `sfd Test

time {
	start: 0
	end: 2
	step: 1
}

stock population {
	init: 100
}
`;

describe("runPipeline", () => {
	it("parses, compiles, and simulates a minimal model end-to-end", async () => {
		const result = await runPipeline(minimalModel);

		expect(result.parseDiagnostics).toEqual([]);
		expect(result.compileDiagnostics).toEqual([]);
		expect(result.ast).not.toBeNull();
		expect(result.ir).not.toBeNull();
		expect(result.simulation).not.toBeNull();
		expect(result.simulation!.rows).toHaveLength(3);
		expect(result.simulation!.rows[0].time).toBe(0);
		expect(result.simulation!.rows[0].population).toBe(100);
	});

	it("stops at parse stage when source has syntax errors", async () => {
		const result = await runPipeline("model {{{");
		expect(result.parseDiagnostics.length).toBeGreaterThan(0);
		expect(result.ast).toBeNull();
		expect(result.ir).toBeNull();
		expect(result.simulation).toBeNull();
	});

	it("stops at compile stage when source has semantic errors", async () => {
		const result = await runPipeline(`sfd Test

time {
	start: 0
	end: 2
	step: 1
}

aux a = nonexistent_variable
`);
		expect(result.parseDiagnostics).toEqual([]);
		expect(result.ast).not.toBeNull();
		expect(result.compileDiagnostics.length).toBeGreaterThan(0);
		expect(result.ir).toBeNull();
		expect(result.simulation).toBeNull();
	});
});
