import { describe, expect, test } from "vitest";
import type { LayoutNode } from "../../src/canvas/layout-types";
import { NodeKindEnum } from "../../src/canvas/layout-types";
import { seedAuxiliaryPositions } from "../../src/canvas/layout-auxiliaries";
import { aux, connection } from "../helpers/ir-builders";

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
