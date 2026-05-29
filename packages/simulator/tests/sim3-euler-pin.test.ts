import { describe, test, expect } from "vitest";

import { runModel } from "./helpers.js";

// SIM3.3 — XMILE §3.4.1 requires Euler as a base integration method. sysdml
// v0.1 ships Euler-only; RK4 deferred to v0.2 ([SIM3.4 → v0.2] +
// [B6.1 → v0.2]). This file is the regression pin so future RK4 work cannot
// silently regress the Euler path.

describe("[SIM3] Euler integration pin — P(t) = P0 · e^(rt)", () => {
	const P0 = 100;
	const r = 0.1;

	function growthModel(start: number, end: number, step: number): string {
		return `
sfd m
time { start: ${start} end: ${end} step: ${step} }
stock population { init: ${P0} }
aux birth_rate = ${r}
flow births { from: null to: population rate: population * birth_rate }
		`.trim();
	}

	test("Euler at step=1, t=10 within 12% of analytical", () => {
		const rows = runModel(growthModel(0, 10, 1));
		const final = rows[rows.length - 1].population;
		const analytical = P0 * Math.exp(r * 10);
		const relativeError = Math.abs(final - analytical) / analytical;
		expect(relativeError).toBeLessThan(0.12);
	});

	test("Euler at step=0.1 converges to within 0.6% of analytical (smaller dt → smaller error)", () => {
		const rowsCoarse = runModel(growthModel(0, 10, 1));
		const rowsFine = runModel(growthModel(0, 10, 0.1));
		const analytical = P0 * Math.exp(r * 10);
		const errCoarse = Math.abs(rowsCoarse[rowsCoarse.length - 1].population - analytical) / analytical;
		const errFine = Math.abs(rowsFine[rowsFine.length - 1].population - analytical) / analytical;
		expect(errFine).toBeLessThan(0.006);
		// Convergence: halving dt should shrink the error.
		expect(errFine).toBeLessThan(errCoarse);
	});

	test("Initial value at t=0 is exactly P0 (no integration step applied yet)", () => {
		const rows = runModel(growthModel(0, 10, 1));
		expect(rows[0].population).toBe(P0);
	});

	test("Euler accumulates monotonically for positive growth rate", () => {
		const rows = runModel(growthModel(0, 5, 1));
		for (let i = 1; i < rows.length; i++) {
			expect(rows[i].population).toBeGreaterThan(rows[i - 1].population);
		}
	});
});
