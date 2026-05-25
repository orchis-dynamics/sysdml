import { describe, expect, test } from "vitest";

import { flowElbowCorner } from "../../src/canvas/edge-geometry.js";

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
