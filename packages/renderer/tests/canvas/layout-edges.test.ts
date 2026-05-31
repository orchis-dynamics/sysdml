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
			points: [],
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
			points: [],
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
		expect([...edges.values()][0].polarity).toBe("=>");
	});
});
