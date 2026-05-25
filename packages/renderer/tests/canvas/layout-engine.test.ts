import { describe, expect, test } from "vitest";
import { computeLayout } from "../../src/canvas/layout-engine.js";
import { connection, flow, ir, stock } from "../helpers/ir-builders.js";

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
