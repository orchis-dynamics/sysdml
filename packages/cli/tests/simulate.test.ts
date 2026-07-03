import { describe, expect, it } from "vitest";

import { isErrorSimDiagnostic, runSimulateCommand } from "../src/simulate.js";

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
	it("emits JSON simulation result on stdout and exits 0 (default format)", async () => {
		const result = await runSimulateCommand(minimalModel, { format: "json" });

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		const parsed = JSON.parse(result.stdout);
		expect(parsed.rows).toHaveLength(3);
		expect(parsed.rows[0]).toEqual({ time: 0, population: 100 });
	});

	it("emits CSV on stdout when format=csv", async () => {
		const result = await runSimulateCommand(minimalModel, { format: "csv" });

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe("time,population\n0,100\n1,100\n2,100\n");
	});

	it("exits 1 with stderr diagnostics and no stdout on compile errors", async () => {
		const broken = `sfd Test

time {
	start: 0
	end: 1
	step: 1
}

aux a = nonexistent
`;
		const result = await runSimulateCommand(broken, { format: "json" });

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("--- Diagnostics ---");
	});

	it("exits 1 with stderr diagnostics when the engine cannot compile a model function", async () => {
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
		const result = await runSimulateCommand(usesDeferredFunction, {
			format: "json",
		});

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("[error]");
	});

	it("rejects cld models with exit code 1 and a clear message", async () => {
		const cldModel = `cld loops

population ->+ births
births ->- population
`;
		const result = await runSimulateCommand(cldModel, { format: "json" });

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain("Cannot simulate 'loops'");
		expect(result.stderr).toContain("sfd");
	});

	it("prints non-fatal compile diagnostics on stderr while still simulating", async () => {
		const multiModel = `sfd main
sfd sub
time { start: 0 end: 2 step: 1 }
stock population { init: 100 }
`;
		const result = await runSimulateCommand(multiModel, { format: "json" });

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toContain("MULTI_MODEL_NOT_SUPPORTED");
		const parsed = JSON.parse(result.stdout);
		expect(parsed.rows).toHaveLength(3);
	});
});

describe("isErrorSimDiagnostic", () => {
	it("treats severity as authoritative when present", () => {
		expect(
			isErrorSimDiagnostic({
				code: "engine_failure",
				message: "m",
				severity: "error",
			}),
		).toBe(true);
		expect(
			isErrorSimDiagnostic({ code: "error", message: "m", severity: "warning" }),
		).toBe(false);
	});

	it("falls back to code when severity is absent", () => {
		expect(isErrorSimDiagnostic({ code: "error", message: "m" })).toBe(true);
		expect(isErrorSimDiagnostic({ code: "warning", message: "m" })).toBe(false);
	});
});
