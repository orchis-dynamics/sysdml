import { Project, Sim } from "@simlin/engine";
import type { IR } from "@sysdml/contracts";
import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SimlinSimulator } from "../src/simlin-simulator.js";

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

function buildIRAllowingWarnings(source: string): IR {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (ast === null || parseDiagnostics.length > 0) {
		throw new Error(parseDiagnostics[0]?.message ?? "parse produced no AST");
	}
	const { ir, diagnostics } = compileAST(ast);
	const errors = diagnostics.filter(
		(diagnostic) => diagnostic.severity !== "warning",
	);
	if (ir === null || errors.length > 0) {
		throw new Error(errors[0]?.message ?? "compile produced no IR");
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

const unsupportedFunctionModel = `
sfd unsupported
time { start: 0 end: 2 step: 1 }
stock x { init: 0 }
flow inflow { from: null to: x rate: RANDOM(0, 1) }
`.trim();

const forecastModel = `
sfd forecast
time { start: 0 end: 3 step: 1 }
stock s { init: 0 }
aux input = TIME
aux probe = FORCST(input, 2, 1)
`.trim();

const supportedSmoothingModel = `
sfd smoothing
time { start: 0 end: 3 step: 1 }
stock s { init: 0 }
aux input = TIME
aux smoothed = SMTH1(input, 2)
aux delayed = DELAY1(input, 1)
aux trended = TREND(input, 2)
`.trim();

const camelCaseModel = `
sfd hydro
time { start: 0 end: 3 step: 1 }
stock waterStock { init: 50 }
aux inflowRate = 5
flow addWater { from: null to: waterStock rate: inflowRate }
`.trim();

const saveStepModel = `
sfd sampled
time { start: 0 end: 10 step: 0.25 save_step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const fineStepModel = `
sfd fine
time { start: 0 end: 10 step: 0.25 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const timeUnitsModel = `
sfd dated
time { start: 0 end: 10 step: 1 time_units: years }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const nonMultipleSaveStepModel = `
sfd snapped
time { start: 0 end: 10 step: 0.4 save_step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const nearMissSaveStepModel = `
sfd near_miss
time { start: 0 end: 10 step: 0.25 save_step: 1.1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const nestedLookupModel = `
sfd nested_lookup
time { start: 0 end: 1 step: 1 }
stock reservoir { init: 2 * response(3) }
aux level = 3
gf response { xscale: [0, 10] ypts: [0, 100] }
aux direct = response(level)
aux scaled = 2 * response(level)
`.trim();

function buildIRWithUnknownReference(): IR {
	const ir = buildIR(growthModel);
	ir.auxiliaries[0].expr = { type: "Reference", id: "ghost" };
	return ir;
}

describe("SimlinSimulator", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

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

	test("save_step thins result rows to the save interval", async () => {
		const result = await new SimlinSimulator().simulate(buildIR(saveStepModel));
		expect(result.diagnostics).toHaveLength(0);
		expect(result.rows.length).toBe(11);
		expect(result.rows.map((row) => row.time)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
		]);
	});

	test("omitted save_step keeps one row per step", async () => {
		const result = await new SimlinSimulator().simulate(buildIR(fineStepModel));
		expect(result.rows.length).toBe(41);
	});

	test("time_units passes through without affecting the run", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIR(timeUnitsModel),
		);
		expect(result.diagnostics).toHaveLength(0);
		expect(result.rows.length).toBe(11);
	});

	test("non-multiple save_step snaps to a whole step multiple", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIRAllowingWarnings(nonMultipleSaveStepModel),
		);
		expect(result.diagnostics).toHaveLength(0);
		expect(result.rows.map((row) => row.time)).toEqual([
			0, 1.2000000000000002, 2.4, 3.5999999999999996, 4.8, 6.000000000000001,
			7.200000000000002, 8.400000000000002, 9.600000000000003,
		]);
	});

	test("snapped near-multiple save_step keeps the full horizon", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIRAllowingWarnings(nearMissSaveStepModel),
		);
		expect(result.diagnostics).toHaveLength(0);
		expect(result.rows.map((row) => row.time)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
		]);
	});

	test("evaluates a graphical function nested inside a larger expression", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIR(nestedLookupModel),
		);
		expect(result.diagnostics).toEqual([]);
		expect(result.rows[0].direct).toBeCloseTo(30, 9);
		expect(result.rows[0].scaled).toBeCloseTo(60, 9);
		expect(result.rows[0].reservoir).toBeCloseTo(60, 9);
	});

	test("evaluates a bare graphical function call as a stock init", async () => {
		const bareInitLookupModel = `
sfd bare_init_lookup
time { start: 0 end: 1 step: 1 }
gf response { xscale: [0, 10] ypts: [0, 100] }
stock reservoir { init: response(3) }
`.trim();
		const result = await new SimlinSimulator().simulate(
			buildIR(bareInitLookupModel),
		);
		expect(result.diagnostics).toEqual([]);
		expect(result.rows[0].reservoir).toBeCloseTo(30, 9);
	});

	test("evaluates a graphical function nested inside another's argument", async () => {
		const chainedLookupModel = `
sfd chained_lookup
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux x = 3
gf inner { xscale: [0, 10] ypts: [0, 100] }
gf outer { xscale: [0, 100] ypts: [0, 1000] }
aux y = outer(inner(x))
`.trim();
		const result = await new SimlinSimulator().simulate(
			buildIR(chainedLookupModel),
		);
		expect(result.diagnostics).toEqual([]);
		expect(result.rows[0].y).toBeCloseTo(300, 9);
	});

	test("reports a clear diagnostic for stochastic functions the deterministic engine cannot run", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIR(unsupportedFunctionModel),
		);
		expect(result.rows).toEqual([]);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].code).toBe("error");
		expect(result.diagnostics[0].severity).toBe("error");
		expect(result.diagnostics[0].message).toContain("RANDOM");
	});

	test("reports a clear diagnostic naming an unsupported builtin instead of an opaque engine error", async () => {
		const result = await new SimlinSimulator().simulate(buildIR(forecastModel));
		expect(result.rows).toEqual([]);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].code).toBe("error");
		expect(result.diagnostics[0].message).toContain("FORCST");
	});

	test("does not flag builtins the engine supports", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIR(supportedSmoothingModel),
		);
		expect(result.diagnostics).toEqual([]);
		expect(result.rows.length).toBe(4);
	});

	test("disposes the engine project and sim after a successful run and can simulate again", async () => {
		const projectDisposeSpy = vi.spyOn(Project.prototype, "dispose");
		const simDisposeSpy = vi.spyOn(Sim.prototype, "dispose");

		const first = await new SimlinSimulator().simulate(buildIR(growthModel));
		expect(first.diagnostics).toEqual([]);
		expect(projectDisposeSpy).toHaveBeenCalledTimes(1);
		expect(simDisposeSpy).toHaveBeenCalledTimes(1);

		const second = await new SimlinSimulator().simulate(buildIR(growthModel));
		expect(second.rows.length).toBe(11);
		expect(projectDisposeSpy).toHaveBeenCalledTimes(2);
		expect(simDisposeSpy).toHaveBeenCalledTimes(2);
	});

	test("disposes the engine project even when the run fails", async () => {
		const projectDisposeSpy = vi.spyOn(Project.prototype, "dispose");

		const result = await new SimlinSimulator().simulate(
			buildIRWithUnknownReference(),
		);
		expect(result.rows).toEqual([]);
		expect(projectDisposeSpy).toHaveBeenCalledTimes(1);
	});

	test("returns check() diagnostics together with the run-failure diagnostic when the run throws", async () => {
		const result = await new SimlinSimulator().simulate(
			buildIRWithUnknownReference(),
		);
		expect(result.rows).toEqual([]);
		expect(result.diagnostics.length).toBeGreaterThanOrEqual(2);
		const messages = result.diagnostics.map((diagnostic) => diagnostic.message);
		expect(
			messages.some((message) => message.includes("unknown_dependency")),
		).toBe(true);
		for (const diagnostic of result.diagnostics) {
			expect(diagnostic.code).toBe("error");
			expect(diagnostic.severity).toBe("error");
		}
	});
});
