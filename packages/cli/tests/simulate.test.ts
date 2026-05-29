import { describe, expect, it } from "vitest";

import { runSimulateCommand } from "../src/simulate.js";

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

describe("runSimulateCommand", () => {
	it("emits JSON simulation result on stdout and exits 0 (default format)", () => {
		const result = runSimulateCommand(minimalModel, { format: "json" });

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		const parsed = JSON.parse(result.stdout);
		expect(parsed.rows).toHaveLength(3);
		expect(parsed.rows[0]).toEqual({ time: 0, population: 100 });
	});

	it("emits CSV on stdout when format=csv", () => {
		const result = runSimulateCommand(minimalModel, { format: "csv" });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("time,population\n0,100\n1,100\n2,100\n");
	});

	it("exits 1 with stderr diagnostics and no stdout on compile errors", () => {
		const broken = `sfd Test

time {
	start: 0
	end: 1
	step: 1
}

aux a = nonexistent
`;
		const result = runSimulateCommand(broken, { format: "json" });

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("--- Diagnostics ---");
	});

	it("emits partial output on stdout and diagnostics on stderr when a sim function is unimplemented", () => {
		const usesDeferredFunction = `sfd Test

time {
	start: 0
	end: 1
	step: 1
}

stock x {
	init: 0
}

aux a = RANDOM(0, 1)
`;
		const result = runSimulateCommand(usesDeferredFunction, { format: "json" });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toBe("");
		expect(result.stderr).toContain("FUNCTION_NOT_IN_V1");
	});
});
