import type { IRGraphicalFunction } from "@sysdml/ir";
import { describe, test, expect } from "vitest";

import { gfLookup } from "../src/gf.js";

function linearGf(
	xscale: [number, number],
	ypts: number[],
): IRGraphicalFunction {
	return { id: "f", kind: "linear", xscale, xpts: null, ypts, yscale: null };
}

function extraGf(
	xscale: [number, number],
	ypts: number[],
): IRGraphicalFunction {
	return { id: "f", kind: "extra", xscale, xpts: null, ypts, yscale: null };
}

function stepGf(xscale: [number, number], ypts: number[]): IRGraphicalFunction {
	return { id: "f", kind: "step", xscale, xpts: null, ypts, yscale: null };
}

function xptsGf(xpts: number[], ypts: number[]): IRGraphicalFunction {
	return { id: "f", kind: "linear", xscale: null, xpts, ypts, yscale: null };
}

describe("gfLookup — linear (continuous)", () => {
	const gf = linearGf([0, 1], [0, 0.5, 1]);

	test("exact left endpoint returns first y", () =>
		expect(gfLookup(gf, 0)).toBeCloseTo(0));
	test("exact right endpoint returns last y", () =>
		expect(gfLookup(gf, 1)).toBeCloseTo(1));
	test("midpoint interpolates correctly", () =>
		expect(gfLookup(gf, 0.25)).toBeCloseTo(0.25));
	test("three-quarter point", () =>
		expect(gfLookup(gf, 0.75)).toBeCloseTo(0.75));
	test("below range clamps to first y", () =>
		expect(gfLookup(gf, -1)).toBeCloseTo(0));
	test("above range clamps to last y", () =>
		expect(gfLookup(gf, 2)).toBeCloseTo(1));
});

describe("gfLookup — extrapolate", () => {
	const gf = extraGf([0, 1], [0, 1]); // slope = 1

	test("in-range midpoint", () => expect(gfLookup(gf, 0.5)).toBeCloseTo(0.5));
	test("below range extrapolates (x=-1 → y=-1)", () =>
		expect(gfLookup(gf, -1)).toBeCloseTo(-1));
	test("above range extrapolates (x=2 → y=2)", () =>
		expect(gfLookup(gf, 2)).toBeCloseTo(2));
});

describe("gfLookup — extrapolate with non-unit slope", () => {
	// xscale [0,2], ypts [0, 4]: slope = 2
	const gf = extraGf([0, 2], [0, 4]);

	test("in-range midpoint", () => expect(gfLookup(gf, 1)).toBeCloseTo(2));
	test("above range (x=3): extrapolate → 6", () =>
		expect(gfLookup(gf, 3)).toBeCloseTo(6));
	test("below range (x=-1): extrapolate → -2", () =>
		expect(gfLookup(gf, -1)).toBeCloseTo(-2));
});

describe("gfLookup — step (discrete)", () => {
	// x: [0, 1, 2], y: [10, 20, 30]
	const gf = stepGf([0, 2], [10, 20, 30]);

	test("at x=0 returns first y", () => expect(gfLookup(gf, 0)).toBe(10));
	test("at x=0.9 still returns first y (step, not linear)", () =>
		expect(gfLookup(gf, 0.9)).toBe(10));
	test("at x=1 returns second y", () => expect(gfLookup(gf, 1)).toBe(20));
	test("at x=1.9 returns second y", () => expect(gfLookup(gf, 1.9)).toBe(20));
	test("at x=2 returns third y", () => expect(gfLookup(gf, 2)).toBe(30));
	test("below range clamps to first y", () =>
		expect(gfLookup(gf, -1)).toBe(10));
	test("above range clamps to last y", () => expect(gfLookup(gf, 99)).toBe(30));
});

describe("gfLookup — explicit xpts", () => {
	const gf = xptsGf([0, 0.5, 1], [0, 10, 20]);

	test("at x=0.5 returns 10 (exact point)", () =>
		expect(gfLookup(gf, 0.5)).toBeCloseTo(10));
	test("at x=0.25 interpolates to 5", () =>
		expect(gfLookup(gf, 0.25)).toBeCloseTo(5));
	test("at x=0.75 interpolates to 15", () =>
		expect(gfLookup(gf, 0.75)).toBeCloseTo(15));
});

describe("gfLookup — edge cases", () => {
	test("single point returns that y for any input", () => {
		const gf: IRGraphicalFunction = {
			id: "f",
			kind: "linear",
			xscale: [0, 0],
			xpts: null,
			ypts: [42],
			yscale: null,
		};
		expect(gfLookup(gf, -1)).toBe(42);
		expect(gfLookup(gf, 0)).toBe(42);
		expect(gfLookup(gf, 99)).toBe(42);
	});

	test("two-point linear with xscale", () => {
		const gf = linearGf([0, 10], [0, 100]);
		expect(gfLookup(gf, 5)).toBeCloseTo(50);
	});

	test("non-uniform xpts with different spacings", () => {
		const gf = xptsGf([0, 1, 10], [0, 10, 100]);
		expect(gfLookup(gf, 0.5)).toBeCloseTo(5);
		expect(gfLookup(gf, 5.5)).toBeCloseTo(55);
	});
});
