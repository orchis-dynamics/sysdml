import type { IR } from "@sysdml/contracts";
import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { describe, expect, test } from "vitest";

import { irToSimlinProject } from "../src/ir-to-simlin.js";

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

describe("irToSimlinProject", () => {
	test("inverts flow direction into stock inflows/outflows", () => {
		const [model] = irToSimlinProject(buildIR(growthModel)).models;
		const [stock] = model.stocks;
		expect(stock.name).toBe("population");
		expect(stock.inflows).toEqual(["births"]);
		expect(stock.outflows).toEqual([]);
		expect(stock.initialEquation).toBe("100");
	});

	test("serializes equations as strings", () => {
		const [model] = irToSimlinProject(buildIR(growthModel)).models;
		expect(model.flows[0].equation).toBe("(population * birth_rate)");
		expect(model.auxiliaries[0].equation).toBe("0.02");
	});

	test("maps the time block into sim specs", () => {
		expect(irToSimlinProject(buildIR(growthModel)).simSpecs).toEqual({
			startTime: 0,
			endTime: 10,
			dt: "1",
			method: "rk4",
		});
	});

	test("maps save_step and time_units into sim specs when present", () => {
		const sampled = `
sfd sampled
time { start: 0 end: 10 step: 0.25 save_step: 1 time_units: years }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();
		expect(irToSimlinProject(buildIR(sampled)).simSpecs).toEqual({
			startTime: 0,
			endTime: 10,
			dt: "0.25",
			saveStep: 1,
			timeUnits: "years",
			method: "rk4",
		});
	});

	test("maps method into sim specs when present", () => {
		const withMethod = `
sfd with_method
time { start: 0 end: 10 step: 1 method: rk2 }
stock population { init: 100 }
`.trim();
		expect(irToSimlinProject(buildIR(withMethod)).simSpecs.method).toBe("rk2");
	});

	test("defaults method to rk4 when omitted", () => {
		expect(irToSimlinProject(buildIR(growthModel)).simSpecs.method).toBe("rk4");
	});

	test("hoists a bare graphical-function stock init into a hidden auxiliary", () => {
		const bareInit = `
sfd bare_init
time { start: 0 end: 1 step: 1 }
gf response { xscale: [0, 10] ypts: [0, 100] }
stock reservoir { init: response(3) }
`.trim();
		const [model] = irToSimlinProject(buildIR(bareInit)).models;
		const [stock] = model.stocks;
		const hidden = model.auxiliaries.find(
			(auxiliary) => auxiliary.name === stock.initialEquation,
		);
		expect(stock.initialEquation).toBe("_lookup_0");
		expect(hidden).toBeDefined();
		expect(hidden!.equation).toBe("3");
		expect(hidden!.graphicalFunction).toBeDefined();
	});

	test("preserves both lookups when a graphical function is nested inside another's argument", () => {
		const nestedGraphicalFunctions = `
sfd nested_gf
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux x = 3
gf inner { xscale: [0, 10] ypts: [0, 100] }
gf outer { xscale: [0, 100] ypts: [0, 1000] }
aux y = outer(inner(x))
`.trim();
		const [model] = irToSimlinProject(buildIR(nestedGraphicalFunctions)).models;
		const graphicalFunctionCount = model.auxiliaries.filter(
			(auxiliary) => auxiliary.graphicalFunction !== undefined,
		).length;
		expect(graphicalFunctionCount).toBe(2);
		const y = model.auxiliaries.find((auxiliary) => auxiliary.name === "y");
		expect(y?.equation).not.toBe("x");
	});

	test("avoids collision when a user variable already uses a hidden-auxiliary name", () => {
		const collidingModel = `
sfd collide
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux _lookup_0 = 5
aux x = 3
gf g { xscale: [0, 10] ypts: [0, 100] }
aux y = 2 * g(x)
`.trim();
		const [model] = irToSimlinProject(buildIR(collidingModel)).models;
		const userAuxiliary = model.auxiliaries.find(
			(auxiliary) => auxiliary.name === "_lookup_0",
		);
		expect(userAuxiliary?.equation).toBe("5");
		expect(userAuxiliary?.graphicalFunction).toBeUndefined();
		const hiddenAuxiliary = model.auxiliaries.find(
			(auxiliary) => auxiliary.name === "_lookup_1",
		);
		expect(hiddenAuxiliary?.graphicalFunction).toBeDefined();
	});

	test("throws instead of silently dropping a graphical-function call with no definition", () => {
		const danglingGraphicalFunction: IR = {
			ir_version: "0.1",
			model: { id: "dangling", kind: "sfd" },
			time: { start: 0, end: 1, step: 1 },
			stocks: [{ id: "s", init: { type: "Number", value: 0 } }],
			auxiliaries: [
				{
					id: "y",
					expr: {
						type: "GraphicalFunctionCall",
						name: "missing",
						argument: { type: "Number", value: 1 },
					},
				},
			],
			flows: [],
			connections: [],
			graphicalFunctions: [],
		};
		expect(() => irToSimlinProject(danglingGraphicalFunction)).toThrow(
			/missing/,
		);
	});
});
