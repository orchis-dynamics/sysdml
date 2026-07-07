import type { IR } from "@sysdml/contracts";
import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { describe, expect, test } from "vitest";

import { SimlinSimulator } from "../src/simlin-simulator.js";

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

function growthModel(step: number, saveStep: number, end: number): string {
	return `
sfd matrix
time { start: 0 end: ${end} step: ${step} save_step: ${saveStep} }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();
}

const MATRIX: Array<[step: number, saveStep: number, end: number]> = [
	[0.4, 1, 10],
	[0.4, 2, 10],
	[0.25, 1.1, 10],
	[0.3, 1, 9],
	[0.5, 2, 10],
	[0.25, 1, 10],
	[1, 3, 10],
];

describe("save_step matrix guard against the engine phantom-row bug (SL8)", () => {
	test.each(MATRIX)(
		"step %f save_step %f end %f yields strictly increasing times and sane values",
		async (step, saveStep, end) => {
			const result = await new SimlinSimulator().simulate(
				buildIRAllowingWarnings(growthModel(step, saveStep, end)),
			);
			expect(result.diagnostics).toEqual([]);
			expect(result.rows.length).toBeGreaterThan(1);
			for (let i = 1; i < result.rows.length; i++) {
				expect(result.rows[i].time).toBeGreaterThan(result.rows[i - 1].time);
			}
			for (const row of result.rows) {
				expect(row.population).toBeGreaterThanOrEqual(100);
			}
		},
	);
});
