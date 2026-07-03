import { compileAST } from "@sysdml/ir";
import type { IR } from "@sysdml/contracts";
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
			method: "euler",
		});
	});
});
