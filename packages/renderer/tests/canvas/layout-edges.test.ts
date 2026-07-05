import { describe, expect, test } from "vitest";

import { constructLayoutEdges } from "../../src/canvas/layout-edges.js";
import { connection, flow } from "../helpers/ir-builders.js";

describe("constructLayoutEdges — flow edges", () => {
	test("produces one edge per flow with from→to stocks", () => {
		const edges = constructLayoutEdges(
			[flow("drain", "stock_a", "stock_b")],
			[],
		);

		expect(edges.size).toBe(1);
		const edge = [...edges.values()][0];
		expect(edge).toMatchObject({
			kind: "flow",
			source: "stock_a",
			target: "stock_b",
		});
		expect(edge.id).toBeTruthy();
	});

	test("flow with null `from` (source cloud) uses flow.id as source", () => {
		const edges = constructLayoutEdges([flow("inflow", null, "stock_a")], []);
		const edge = [...edges.values()][0];
		expect(edge.source).toBe("inflow");
		expect(edge.target).toBe("stock_a");
	});

	test("flow with null `to` (sink cloud) uses flow.id as target", () => {
		const edges = constructLayoutEdges([flow("outflow", "stock_a", null)], []);
		const edge = [...edges.values()][0];
		expect(edge.source).toBe("stock_a");
		expect(edge.target).toBe("outflow");
	});
});

describe("constructLayoutEdges — connection edges", () => {
	test("produces one edge per connection with polarity", () => {
		const edges = constructLayoutEdges(
			[],
			[connection("aux_a", "aux_b", "+"), connection("aux_b", "stock_c", "-")],
		);

		expect(edges.size).toBe(2);
		const edgeList = [...edges.values()];
		expect(edgeList[0]).toMatchObject({
			kind: "connection",
			source: "aux_a",
			target: "aux_b",
			polarity: "+",
		});
		expect(edgeList[1]).toMatchObject({
			kind: "connection",
			source: "aux_b",
			target: "stock_c",
			polarity: "-",
		});
	});

	test("produces no edges for empty inputs", () => {
		expect(constructLayoutEdges([], []).size).toBe(0);
	});

	test("flow-style connection (=>) is preserved", () => {
		const edges = constructLayoutEdges([], [connection("a", "b", "=>")]);
		const edge = [...edges.values()][0];
		expect(edge.kind).toBe("connection");
		if (edge.kind === "connection") {
			expect(edge.polarity).toBe("=>");
		}
	});
});

describe("constructLayoutEdges — routing hints", () => {
	test("connection angle and via propagate to the edge", () => {
		const edges = constructLayoutEdges(
			[],
			[connection("a", "b", "+", { angle: 45, via: { x: 150, y: 80 } })],
		);
		expect([...edges.values()][0]).toMatchObject({
			kind: "connection",
			angle: 45,
			via: { x: 150, y: 80 },
		});
	});

	test("connection without hints has undefined angle and via", () => {
		const edges = constructLayoutEdges([], [connection("a", "b")]);
		const edge = [...edges.values()][0];
		expect(edge.kind).toBe("connection");
		if (edge.kind === "connection") {
			expect(edge.angle).toBeUndefined();
			expect(edge.via).toBeUndefined();
		}
	});

	test("flow via waypoints propagate to the edge", () => {
		const edges = constructLayoutEdges(
			[flow("drain", "stock_a", "stock_b", undefined, [{ x: 200, y: 100 }])],
			[],
		);
		expect([...edges.values()][0]).toMatchObject({
			kind: "flow",
			via: [{ x: 200, y: 100 }],
		});
	});

	test("assigns occurrence indexes to duplicate connection triples and keeps both edges", () => {
		const edges = constructLayoutEdges(
			[],
			[
				{ from: "a", polarity: "+", to: "b" },
				{ from: "a", polarity: "+", to: "b", angle: 45 },
				{ from: "a", polarity: "-", to: "b" },
			],
		);
		expect(edges.get("conn-a-+-b-0")).toMatchObject({ occurrence: 0 });
		expect(edges.get("conn-a-+-b-1")).toMatchObject({
			occurrence: 1,
			angle: 45,
		});
		expect(edges.get("conn-a---b-0")).toMatchObject({
			occurrence: 0,
			polarity: "-",
		});
		expect(edges.size).toBe(3);
	});
});
