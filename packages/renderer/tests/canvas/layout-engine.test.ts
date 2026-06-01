import { describe, expect, test } from "vitest";

import { computeLayout } from "../../src/canvas/layout-engine.js";
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
