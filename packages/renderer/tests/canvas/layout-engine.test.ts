import { describe, expect, test } from "vitest";

import { computeLayout } from "../../src/canvas/layout-engine.js";
import {
	orthogonalPipePoints,
	polylineMidpoint,
} from "../../src/canvas/edge-geometry.js";
import { aux, connection, flow, ir, stock } from "../helpers/ir-builders.js";

describe("computeLayout — SFD edges", () => {
	test("emits a flow edge for each flow", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("a"), stock("b")],
				flows: [flow("drain", "a", "b")],
			}),
		);

		const flowEdges = result.edges.filter((e) => e.kind === "flow");
		expect(flowEdges).toHaveLength(1);
		expect(flowEdges[0]).toMatchObject({ source: "a", target: "b" });
	});

	test("emits a connection edge for each connection", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("a")],
				flows: [flow("inflow", null, "a")],
				connections: [connection("a", "inflow", "+")],
			}),
		);

		const connEdges = result.edges.filter((e) => e.kind === "connection");
		expect(connEdges).toHaveLength(1);
		expect(connEdges[0]).toMatchObject({
			source: "a",
			target: "inflow",
			polarity: "+",
		});
	});
});

describe("computeLayout — SFD auxiliaries", () => {
	test("emits a LayoutNode for each auxiliary", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("a"), stock("b")],
				flows: [flow("drain", "a", "b")],
				auxiliaries: [aux("birth_rate"), aux("death_rate")],
				connections: [
					connection("birth_rate", "drain"),
					connection("death_rate", "drain"),
				],
			}),
		);

		const auxNodes = result.nodes.filter((n) => n.kind === "aux");
		expect(auxNodes.map((n) => n.id).sort()).toEqual([
			"birth_rate",
			"death_rate",
		]);
	});

	test("preserves explicit aux IR position", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("a")],
				auxiliaries: [aux("pinned_aux", { x: 999, y: 888 })],
			}),
		);

		const auxNode = result.nodes.find((n) => n.id === "pinned_aux")!;
		expect(auxNode.position).toEqual({ x: 999, y: 888 });
	});
});

describe("computeLayout — explicit SFD positions", () => {
	test("places a stock at its explicit IR position", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("anchored", { x: 300, y: 200 })],
			}),
		);

		const stockNode = result.nodes.find((node) => node.id === "anchored");
		expect(stockNode?.position).toEqual({ x: 300, y: 200 });
	});

	test("places a flow at its explicit IR position", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("a"), stock("b")],
				flows: [flow("drain", "a", "b", { x: 500, y: 50 })],
			}),
		);

		const flowNode = result.nodes.find((node) => node.id === "drain");
		expect(flowNode?.position).toEqual({ x: 500, y: 50 });
	});

	test("auto-places stocks without an explicit position", () => {
		const result = computeLayout(
			ir({
				stocks: [stock("free")],
			}),
		);

		const stockNode = result.nodes.find((node) => node.id === "free");
		expect(stockNode?.position).toEqual({ x: 0, y: 0 });
	});
});

describe("computeLayout — CLD", () => {
	test("renders a node for each unique connection endpoint", () => {
		const result = computeLayout(
			ir({
				model: { id: "test", kind: "cld" },
				connections: [
					connection("a", "b", "+"),
					connection("b", "c", "-"),
					connection("c", "a", "+"),
				],
			}),
		);

		expect(result.nodes.map((node) => node.id).sort()).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(result.nodes.every((node) => node.kind === "aux")).toBe(true);
	});

	test("gives each CLD node a distinct position", () => {
		const result = computeLayout(
			ir({
				model: { id: "test", kind: "cld" },
				connections: [
					connection("a", "b"),
					connection("b", "c"),
					connection("c", "d"),
					connection("d", "a"),
				],
			}),
		);

		const positionKeys = result.nodes.map(
			(node) => `${Math.round(node.position.x)},${Math.round(node.position.y)}`,
		);
		expect(new Set(positionKeys).size).toBe(result.nodes.length);
	});

	test("includes a positioned aux with no connections", () => {
		const result = computeLayout(
			ir({
				model: { id: "test", kind: "cld" },
				auxiliaries: [aux("island", { x: 10, y: 20 })],
				connections: [connection("a", "b")],
			}),
		);

		expect(result.nodes.map((node) => node.id).sort()).toEqual([
			"a",
			"b",
			"island",
		]);
		const islandNode = result.nodes.find((node) => node.id === "island");
		expect(islandNode?.position).toEqual({ x: 10, y: 20 });
	});

	test("includes an unpositioned aux with no connections", () => {
		const result = computeLayout(
			ir({
				model: { id: "test", kind: "cld" },
				auxiliaries: [aux("floating")],
				connections: [connection("a", "b")],
			}),
		);

		expect(result.nodes.map((node) => node.id)).toContain("floating");
	});

	test("emits a connection edge with polarity for each CLD link", () => {
		const result = computeLayout(
			ir({
				model: { id: "test", kind: "cld" },
				connections: [connection("a", "b", "-")],
			}),
		);

		const connectionEdges = result.edges.filter(
			(edge) => edge.kind === "connection",
		);
		expect(connectionEdges).toHaveLength(1);
		expect(connectionEdges[0]).toMatchObject({
			source: "a",
			target: "b",
			polarity: "-",
		});
	});
});

describe("computeLayout — valve placement for flows with via", () => {
	test("flow with via and no explicit position gets its valve at the pipe midpoint", () => {
		const layout = computeLayout(
			ir({
				stocks: [stock("a", { x: 0, y: 0 }), stock("b", { x: 400, y: 0 })],
				flows: [
					flow("transfer", "a", "b", undefined, [{ x: 200, y: 200 }]),
				],
			}),
		);
		const valve = layout.nodes.find((node) => node.id === "transfer");
		if (!valve) throw new Error("expected the flow node");
		const stockA = layout.nodes.find((node) => node.id === "a");
		const stockB = layout.nodes.find((node) => node.id === "b");
		if (!stockA || !stockB) throw new Error("expected both stocks");
		const sourceCenter = {
			x: stockA.position.x + stockA.size.width / 2,
			y: stockA.position.y + stockA.size.height / 2,
		};
		const targetCenter = {
			x: stockB.position.x + stockB.size.width / 2,
			y: stockB.position.y + stockB.size.height / 2,
		};
		const expectedMidpoint = polylineMidpoint(
			orthogonalPipePoints(sourceCenter, [{ x: 200, y: 200 }], targetCenter),
		);
		expect(valve.position.x + valve.size.width / 2).toBeCloseTo(
			expectedMidpoint.x,
			4,
		);
		expect(valve.position.y + valve.size.height / 2).toBeCloseTo(
			expectedMidpoint.y,
			4,
		);
	});

	test("flow with via AND explicit position keeps the explicit position", () => {
		const layout = computeLayout(
			ir({
				stocks: [stock("a", { x: 0, y: 0 }), stock("b", { x: 400, y: 0 })],
				flows: [
					flow("transfer", "a", "b", { x: 33, y: 44 }, [{ x: 200, y: 200 }]),
				],
			}),
		);
		const valve = layout.nodes.find((node) => node.id === "transfer");
		expect(valve?.position).toEqual({ x: 33, y: 44 });
	});

	test("flow without via keeps its skeleton placement", () => {
		const withoutVia = computeLayout(
			ir({
				stocks: [stock("a"), stock("b")],
				flows: [flow("transfer", "a", "b")],
			}),
		);
		const withEmptyVia = computeLayout(
			ir({
				stocks: [stock("a"), stock("b")],
				flows: [flow("transfer", "a", "b", undefined, [])],
			}),
		);
		expect(
			withoutVia.nodes.find((node) => node.id === "transfer")?.position,
		).toEqual(
			withEmptyVia.nodes.find((node) => node.id === "transfer")?.position,
		);
	});
});
