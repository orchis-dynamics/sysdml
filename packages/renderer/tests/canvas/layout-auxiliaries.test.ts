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

import { computeRepulsion } from "../../src/canvas/layout-auxiliaries";

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

import { computeAttraction } from "../../src/canvas/layout-auxiliaries";

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
