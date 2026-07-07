import type { IR } from "@sysdml/contracts";
import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { expect, test, vi } from "vitest";

import { SimlinSimulator } from "../src/simlin-simulator.js";

vi.mock("@simlin/engine/direct-backend", () => {
	let initAttemptCount = 0;
	class DirectBackend {
		init(): Promise<void> {
			initAttemptCount += 1;
			if (initAttemptCount === 1) {
				return Promise.reject(new Error("simulated wasm load failure"));
			}
			return Promise.resolve();
		}
		projectOpenJson(): never {
			throw new Error("engine reached after retry");
		}
	}
	return { DirectBackend };
});

function buildIR(source: string): IR {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (ast === null || parseDiagnostics.length > 0) {
		throw new Error(parseDiagnostics[0]?.message ?? "parse produced no AST");
	}
	const { ir, diagnostics } = compileAST(ast);
	if (ir === null || diagnostics.length > 0) {
		throw new Error(diagnostics[0]?.message ?? "compile produced no IR");
	}
	return ir;
}

const growthModel = `
sfd population_growth
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

test("retries backend initialization after a failed init instead of caching the rejection", async () => {
	const simulator = new SimlinSimulator();
	const ir = buildIR(growthModel);

	const first = await simulator.simulate(ir);
	expect(first.rows).toEqual([]);
	expect(first.diagnostics[0].message).toContain("simulated wasm load failure");

	const second = await simulator.simulate(ir);
	expect(second.diagnostics[0].message).toContain("engine reached after retry");
});
