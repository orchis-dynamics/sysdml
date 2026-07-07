import type { IR } from "@sysdml/contracts";
import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { describe, expect, test } from "vitest";

import { SimlinSimulator } from "../src/simlin-simulator.js";

const ANALYTIC_FINAL = 100 * Math.exp(1);

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

function growthModel(method: string, step: number): string {
	return `
sfd convergence
time { start: 0 end: 10 step: ${step} method: ${method} }
stock population { init: 100 }
aux growth_rate = 0.1
flow births { from: null to: population rate: population * growth_rate }
`.trim();
}

async function finalError(method: string, step: number): Promise<number> {
	const result = await new SimlinSimulator().simulate(
		buildIR(growthModel(method, step)),
	);
	expect(result.diagnostics).toEqual([]);
	const final = result.rows.at(-1)!.population;
	return Math.abs(final - ANALYTIC_FINAL);
}

describe("integration method convergence (SIM3.4)", () => {
	test("at fixed dt the methods rank euler < rk2 < rk4 in accuracy", async () => {
		const euler = await finalError("euler", 1);
		const rk2 = await finalError("rk2", 1);
		const rk4 = await finalError("rk4", 1);
		expect(euler).toBeGreaterThan(rk2);
		expect(rk2).toBeGreaterThan(rk4);
		expect(euler).toBeGreaterThan(12);
		expect(rk4).toBeLessThan(0.001);
	});

	test("euler error halves when dt halves (first-order convergence)", async () => {
		const errors = [
			await finalError("euler", 1),
			await finalError("euler", 0.5),
			await finalError("euler", 0.25),
		];
		for (const ratio of [errors[1] / errors[0], errors[2] / errors[1]]) {
			expect(ratio).toBeGreaterThan(0.4);
			expect(ratio).toBeLessThan(0.6);
		}
	});

	test("rk2 error quarters when dt halves (second-order convergence)", async () => {
		const errors = [
			await finalError("rk2", 1),
			await finalError("rk2", 0.5),
			await finalError("rk2", 0.25),
		];
		for (const ratio of [errors[1] / errors[0], errors[2] / errors[1]]) {
			expect(ratio).toBeGreaterThan(0.2);
			expect(ratio).toBeLessThan(0.3);
		}
	});

	test("rk4 error shrinks sixteenfold when dt halves (fourth-order convergence)", async () => {
		const errors = [
			await finalError("rk4", 1),
			await finalError("rk4", 0.5),
			await finalError("rk4", 0.25),
		];
		for (const ratio of [errors[1] / errors[0], errors[2] / errors[1]]) {
			expect(ratio).toBeGreaterThan(0.05);
			expect(ratio).toBeLessThan(0.08);
		}
	});

	test("every method approaches the analytic solution as dt shrinks", async () => {
		expect(await finalError("euler", 0.25)).toBeLessThan(3.5);
		expect(await finalError("rk2", 0.25)).toBeLessThan(0.03);
		expect(await finalError("rk4", 0.25)).toBeLessThan(0.000002);
	});
});
