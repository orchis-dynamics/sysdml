import { compileAST } from "@sysdml/ir";
import type { IR } from "@sysdml/contracts";
import { parseSource } from "@sysdml/parser";
import { describe, expect, test } from "vitest";

import { SimlinSimulator } from "../src/simlin-simulator.js";

function buildIR(source: string): IR {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (parseDiagnostics.length > 0) throw new Error(parseDiagnostics[0].message);
	const { ir, diagnostics } = compileAST(ast!);
	if (diagnostics.length > 0) throw new Error(diagnostics[0].message);
	return ir!;
}

const growthModel = `
sfd population_growth
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

describe("SimlinSimulator", () => {
	test("runs a model and returns rows keyed by variable id", async () => {
		const result = await new SimlinSimulator().simulate(buildIR(growthModel));
		expect(result.rows.length).toBe(11);
		expect(result.rows[0].time).toBe(0);
		expect(result.rows[0].population).toBeCloseTo(100, 9);
		expect(result.rows[10].population).toBeGreaterThan(100);
		expect(result.diagnostics).toEqual([]);
	});
});
