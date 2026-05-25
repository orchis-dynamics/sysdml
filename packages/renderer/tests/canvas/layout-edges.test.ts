import { describe, expect, test } from "vitest";
import { constructLayoutEdges } from "../../src/canvas/layout-edges.js";
import { connection, flow } from "../helpers/ir-builders.js";

describe("constructLayoutEdges — flow edges", () => {
    test("produces one edge per flow with from→to stocks", () => {
        const edges = constructLayoutEdges([flow("drain", "stock_a", "stock_b")], []);

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
