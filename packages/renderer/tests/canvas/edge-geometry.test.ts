import { describe, expect, test } from "vitest";

import {
	connectionControlPoint,
	flowElbowCorner,
} from "../../src/canvas/edge-geometry.js";

describe("flowElbowCorner", () => {
	test("returns null when source and target share Y", () => {
		expect(flowElbowCorner({ x: 10, y: 20 }, { x: 100, y: 20 })).toBeNull();
	});

	test("target above-right: corner at (tgt.x, src.y)", () => {
		expect(flowElbowCorner({ x: 10, y: 50 }, { x: 100, y: 20 })).toEqual({
			x: 100,
			y: 50,
		});
	});

	test("target below-right: corner at (tgt.x, src.y)", () => {
		expect(flowElbowCorner({ x: 10, y: 20 }, { x: 100, y: 80 })).toEqual({
			x: 100,
			y: 20,
		});
	});

	test("target above-left: corner at (tgt.x, src.y)", () => {
		expect(flowElbowCorner({ x: 100, y: 50 }, { x: 10, y: 20 })).toEqual({
			x: 10,
			y: 50,
		});
	});

	test("target below-left: corner at (tgt.x, src.y)", () => {
		expect(flowElbowCorner({ x: 100, y: 20 }, { x: 10, y: 80 })).toEqual({
			x: 10,
			y: 20,
		});
	});

	test("vertically stacked (same X, different Y): corner equals source", () => {
		expect(flowElbowCorner({ x: 50, y: 10 }, { x: 50, y: 100 })).toEqual({
			x: 50,
			y: 10,
		});
	});
});

describe("connectionControlPoint", () => {
	test("bulges a left-to-right link to the lower (clockwise) side", () => {
		const control = connectionControlPoint({ x: 0, y: 0 }, { x: 100, y: 0 });
		expect(control.x).toBeCloseTo(50);
		expect(control.y).toBeCloseTo(60);
	});

	test("bulges a top-to-bottom link to the right (clockwise) side", () => {
		const control = connectionControlPoint({ x: 0, y: 0 }, { x: 0, y: 100 });
		expect(control.x).toBeCloseTo(-60);
		expect(control.y).toBeCloseTo(50);
	});
});
