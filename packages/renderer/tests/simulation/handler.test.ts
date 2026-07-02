import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import type { IR, SimulationResult, Simulator } from "@sysdml/contracts";
import { describe, expect, test } from "vitest";
import { handleSimulationRequest } from "../../src/simulation/handler.js";
import type { SimulateRequest, WorkerRequest } from "../../src/simulation/types.js";

const stubResult: SimulationResult = { rows: [{ time: 0 }], diagnostics: [] };
const stubSimulator: Simulator = {
	simulate(_ir: IR): SimulationResult {
		return stubResult;
	},
};

function buildIR(source: string) {
	const { ast } = parseSource(source);
	if (!ast) throw new Error("parse failed in fixture");
	const { ir } = compileAST(ast);
	if (!ir) throw new Error("compile failed in fixture");
	return ir;
}

const MINIMAL_MODEL = `
sfd Test
time { start: 0 end: 5 step: 1 }
stock population { init: 100 }
aux growth_rate = 0.1
flow births { from: null to: population rate: population * growth_rate }
`.trim();

describe("handleSimulationRequest", () => {
	test("returns result with rows for a valid IR", async () => {
		const request: SimulateRequest = {
			type: "simulate",
			jobId: 7,
			ir: buildIR(MINIMAL_MODEL),
		};
		const response = await handleSimulationRequest(request, stubSimulator);
		expect(response.type).toBe("result");
		if (response.type !== "result") throw new Error("unreachable");
		expect(response.jobId).toBe(7);
		expect(response.result.rows).toBe(stubResult.rows);
		expect(response.result.diagnostics).toBe(stubResult.diagnostics);
	});

	test("preserves jobId in the response", async () => {
		const request: SimulateRequest = {
			type: "simulate",
			jobId: 42,
			ir: buildIR(MINIMAL_MODEL),
		};
		const response = await handleSimulationRequest(request, stubSimulator);
		expect(response.jobId).toBe(42);
	});

	test("forwards a simulator result with diagnostics as a result response", async () => {
		const diagnosticResult: SimulationResult = {
			rows: [{ time: 0 }],
			diagnostics: [{ code: "CYCLE_IN_AUX", message: "cycle detected" }],
		};
		const diagnosticSimulator: Simulator = {
			simulate(_ir: IR): SimulationResult {
				return diagnosticResult;
			},
		};
		const request: SimulateRequest = {
			type: "simulate",
			jobId: 1,
			ir: buildIR(MINIMAL_MODEL),
		};
		const response = await handleSimulationRequest(request, diagnosticSimulator);
		expect(response.type).toBe("result");
		if (response.type !== "result") throw new Error("unreachable");
		expect(response.jobId).toBe(1);
		expect(response.result.diagnostics).toBe(diagnosticResult.diagnostics);
	});

	test("returns error response for an unknown request type", async () => {
		const badRequest = { type: "bogus", jobId: 7 } as unknown as WorkerRequest;
		const response = await handleSimulationRequest(badRequest, stubSimulator);
		expect(response.type).toBe("error");
		if (response.type !== "error") throw new Error("unreachable");
		expect(response.jobId).toBe(7);
		expect(response.message).toContain("Unknown request type");
		expect(response.diagnostic).toBeNull();
	});

	test("returns error response when simulator throws an unexpected JS error", async () => {
		const throwingSimulator: Simulator = {
			simulate(_ir: IR): SimulationResult {
				throw new Error("unexpected crash");
			},
		};
		const request: SimulateRequest = {
			type: "simulate",
			jobId: 99,
			ir: buildIR(MINIMAL_MODEL),
		};
		const response = await handleSimulationRequest(request, throwingSimulator);
		expect(response.type).toBe("error");
		if (response.type !== "error") throw new Error("unreachable");
		expect(response.jobId).toBe(99);
		expect(response.message.length).toBeGreaterThan(0);
		expect(response.diagnostic).toBeNull();
	});
});
