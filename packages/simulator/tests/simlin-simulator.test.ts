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

const unsupportedFunctionModel = `
sfd unsupported
time { start: 0 end: 2 step: 1 }
stock x { init: 0 }
flow inflow { from: null to: x rate: RANDOM(0, 1) }
`.trim();

const camelCaseModel = `
sfd hydro
time { start: 0 end: 3 step: 1 }
stock waterStock { init: 50 }
aux inflowRate = 5
flow addWater { from: null to: waterStock rate: inflowRate }
`.trim();

describe("SimlinSimulator", () => {
	test("runs a model and returns rows keyed by variable id", async () => {
		const result = await new SimlinSimulator().simulate(buildIR(growthModel));
		expect(result.rows.length).toBe(11);
		expect(result.rows[0].time).toBe(0);
		expect(result.rows[0].population).toBeCloseTo(100, 9);
		expect(result.rows[10].population).toBeGreaterThan(100);
		expect(result.diagnostics).toEqual([]);
		expect(Object.keys(result.rows[0]).sort()).toEqual([
			"birth_rate",
			"births",
			"population",
			"time",
		]);
	});

	test("keys rows by the original camelCase id even though the engine canonicalizes identifiers to lowercase", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIR(camelCaseModel),
		);
		expect(result.diagnostics).toEqual([]);
		expect(Object.keys(result.rows[0]).sort()).toEqual([
			"addWater",
			"inflowRate",
			"time",
			"waterStock",
		]);
		expect(result.rows[0].waterStock).toBeCloseTo(50, 9);
		expect(result.rows[3].waterStock).toBeCloseTo(65, 9);
	});

	test("resolves with diagnostics instead of throwing on unsupported engine functions", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIR(unsupportedFunctionModel),
		);
		expect(result.rows).toEqual([]);
		expect(result.diagnostics.length).toBeGreaterThan(0);
		expect(result.diagnostics[0].code).toBe("error");
	});
});
