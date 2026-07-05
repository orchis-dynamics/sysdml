import { describe, expect, test } from "vitest";

import { seedAuxiliaryPositions } from "../src/layout-auxiliaries.js";
import type { LayoutNode } from "../src/layout-types.js";
import { NodeKindEnum } from "../src/layout-types.js";
import { aux, connection } from "./helpers/ir-builders.js";

function stockNode(id: string, x: number, y: number): LayoutNode {
	return {
		id,
		kind: NodeKindEnum.Stock,
		position: { x, y },
		size: { width: 0, height: 0 },
	};
}

describe("seedAuxiliaryPositions", () => {
	test("uses explicit IR position when present", () => {
		const seeds = seedAuxiliaryPositions(
			[aux("a", { x: 50, y: 75 })],
			[],
			new Map(),
		);
		expect(seeds.get("a")).toEqual({ x: 50, y: 75 });
	});

	test("seeds at centroid of connected skeleton neighbors", () => {
		const skeleton = new Map<string, LayoutNode>([
			["s1", stockNode("s1", 0, 0)],
			["s2", stockNode("s2", 200, 100)],
		]);
		const seeds = seedAuxiliaryPositions(
			[aux("birth_rate")],
			[connection("s1", "birth_rate"), connection("birth_rate", "s2")],
			skeleton,
		);
		expect(seeds.get("birth_rate")).toEqual({ x: 100, y: 50 });
	});

	test("falls back to skeleton bounding-box center when aux has no connections", () => {
		const skeleton = new Map<string, LayoutNode>([
			["s1", stockNode("s1", 0, 0)],
			["s2", stockNode("s2", 200, 100)],
		]);
		const seeds = seedAuxiliaryPositions([aux("orphan")], [], skeleton);
		expect(seeds.get("orphan")).toEqual({ x: 100, y: 50 });
	});

	test("falls back to (0,0) when skeleton is empty and aux has no connections", () => {
		const seeds = seedAuxiliaryPositions([aux("orphan")], [], new Map());
		expect(seeds.get("orphan")).toEqual({ x: 0, y: 0 });
	});
});

import { computeRepulsion } from "../src/layout-auxiliaries.js";

describe("computeRepulsion", () => {
	test("pushes two coincident nodes apart along an arbitrary unit vector", () => {
		// Coincident nodes get a tiny jitter; the magnitudes must be equal and opposite.
		const positions = new Map([
			["a", { x: 0, y: 0 }],
			["b", { x: 0, y: 0 }],
		]);
		const displacement = computeRepulsion(positions, 50);
		const da = displacement.get("a")!;
		const db = displacement.get("b")!;
		expect(da.x).toBeCloseTo(-db.x, 6);
		expect(da.y).toBeCloseTo(-db.y, 6);
		expect(Math.hypot(da.x, da.y)).toBeGreaterThan(0);
	});

	test("repulsion magnitude follows k^2 / distance", () => {
		const positions = new Map([
			["a", { x: 0, y: 0 }],
			["b", { x: 10, y: 0 }],
		]);
		const k = 50;
		const displacement = computeRepulsion(positions, k);
		// f = (k^2 / dist) along the unit vector from b to a, applied to a
		// expected |dx| on a = k^2 / dist = 2500 / 10 = 250
		expect(displacement.get("a")!.x).toBeCloseTo(-250, 6);
		expect(displacement.get("b")!.x).toBeCloseTo(250, 6);
	});
});

import { computeAttraction } from "../src/layout-auxiliaries.js";

describe("computeAttraction", () => {
	test("pulls two connected nodes together with magnitude dist^2 / k", () => {
		const positions = new Map([
			["a", { x: 0, y: 0 }],
			["b", { x: 10, y: 0 }],
		]);
		const k = 50;
		const displacement = computeAttraction(
			positions,
			[{ from: "a", to: "b" }],
			k,
		);
		// f = dist^2 / k = 100 / 50 = 2; applied as +x on a, -x on b
		expect(displacement.get("a")!.x).toBeCloseTo(2, 6);
		expect(displacement.get("b")!.x).toBeCloseTo(-2, 6);
	});

	test("ignores edges referencing unknown nodes", () => {
		const positions = new Map([["a", { x: 0, y: 0 }]]);
		const displacement = computeAttraction(
			positions,
			[{ from: "a", to: "missing" }],
			50,
		);
		expect(displacement.get("a")).toEqual({ x: 0, y: 0 });
	});

	test("returns zero displacement when there are no edges", () => {
		const positions = new Map([
			["a", { x: 0, y: 0 }],
			["b", { x: 10, y: 0 }],
		]);
		const displacement = computeAttraction(positions, [], 50);
		expect(displacement.get("a")).toEqual({ x: 0, y: 0 });
		expect(displacement.get("b")).toEqual({ x: 0, y: 0 });
	});
});

import { applyDisplacement } from "../src/layout-auxiliaries.js";

describe("applyDisplacement", () => {
	test("does not move pinned ids", () => {
		const positions = new Map([
			["a", { x: 0, y: 0 }],
			["b", { x: 0, y: 0 }],
		]);
		const displacement = new Map([
			["a", { x: 5, y: 0 }],
			["b", { x: 5, y: 0 }],
		]);
		const { positions: next } = applyDisplacement(
			positions,
			displacement,
			new Set(["a"]),
			10,
		);
		expect(next.get("a")).toEqual({ x: 0, y: 0 });
		expect(next.get("b")).toEqual({ x: 5, y: 0 });
	});

	test("clamps step length to temperature", () => {
		const positions = new Map([["a", { x: 0, y: 0 }]]);
		// Displacement length 50, temperature 10 → step length 10
		const displacement = new Map([["a", { x: 30, y: 40 }]]);
		const { positions: next } = applyDisplacement(
			positions,
			displacement,
			new Set(),
			10,
		);
		const dx = next.get("a")!.x;
		const dy = next.get("a")!.y;
		expect(Math.hypot(dx, dy)).toBeCloseTo(10, 6);
		expect(dx).toBeCloseTo(6, 6); // 30/50 * 10
		expect(dy).toBeCloseTo(8, 6); // 40/50 * 10
	});

	test("returns max step length applied this iteration", () => {
		const positions = new Map([["a", { x: 0, y: 0 }]]);
		const displacement = new Map([["a", { x: 3, y: 4 }]]);
		const result = applyDisplacement(positions, displacement, new Set(), 100);
		expect(result.maxStep).toBeCloseTo(5, 6);
		expect(result.positions.get("a")).toEqual({ x: 3, y: 4 });
	});
});

import { constructAuxiliaryLayoutNodes } from "../src/layout-auxiliaries.js";

describe("constructAuxiliaryLayoutNodes", () => {
	test("returns empty map when there are no auxiliaries", () => {
		const result = constructAuxiliaryLayoutNodes([], [], new Map());
		expect(result.size).toBe(0);
	});

	test("preserves explicit IR position on auxiliaries", () => {
		const result = constructAuxiliaryLayoutNodes(
			[aux("p", { x: 42, y: 84 })],
			[],
			new Map(),
		);
		expect(result.get("p")!.position).toEqual({ x: 42, y: 84 });
	});

	test("converts the solver's center coordinates to a top-left position", () => {
		const result = constructAuxiliaryLayoutNodes([aux("solo")], [], new Map());
		const node = result.get("solo");
		if (!node) throw new Error("missing solo node");
		expect(node.position.x).toBeCloseTo(-node.size.width / 2, 6);
		expect(node.position.y).toBeCloseTo(-node.size.height / 2, 6);
	});

	test("produces a LayoutNode with kind=aux and a non-zero size", () => {
		const result = constructAuxiliaryLayoutNodes(
			[aux("birth_rate")],
			[],
			new Map(),
		);
		const node = result.get("birth_rate")!;
		expect(node.kind).toBe("aux");
		expect(node.size.width).toBeGreaterThan(0);
		expect(node.size.height).toBeGreaterThan(0);
	});

	test("does not move pinned skeleton nodes (they are not in the result)", () => {
		const skeleton = new Map<string, LayoutNode>([
			["s1", stockNode("s1", 100, 200)],
		]);
		const result = constructAuxiliaryLayoutNodes(
			[aux("a"), aux("b")],
			[connection("s1", "a"), connection("a", "b")],
			skeleton,
		);
		expect(result.has("s1")).toBe(false);
		expect(result.get("a")).toBeDefined();
		expect(result.get("b")).toBeDefined();
	});

	test("FR converges (final result is deterministic for the same input)", () => {
		const skeleton = new Map<string, LayoutNode>([
			["s1", stockNode("s1", 0, 0)],
			["s2", stockNode("s2", 400, 0)],
		]);
		const auxes = [aux("a"), aux("b")];
		const connections = [
			connection("s1", "a"),
			connection("a", "b"),
			connection("b", "s2"),
		];
		const first = constructAuxiliaryLayoutNodes(auxes, connections, skeleton);
		const second = constructAuxiliaryLayoutNodes(auxes, connections, skeleton);
		expect(first.get("a")!.position).toEqual(second.get("a")!.position);
		expect(first.get("b")!.position).toEqual(second.get("b")!.position);
	});
});
