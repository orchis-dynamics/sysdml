import { describe, expect, test } from "vitest";

import {
	connectionControlPoint,
	flowElbowCorner,
	arcFromChordAndCentralAngle,
	segmentStartPoint,
	segmentEndPoint,
	segmentPointAt,
	segmentTangentAt,
	segmentConvexNormalAt,
	svgPathFromSegments,
	arcThroughThreePoints,
	tangentContinuationArc,
	connectionRoutedSegments,
	type PathSegment,
	type Point,
} from "../../src/canvas/edge-geometry.js";

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

describe("connectionControlPoint", () => {
	test("default sign (SFD) bulges a left-to-right link upward", () => {
		const control = connectionControlPoint({ x: 0, y: 0 }, { x: 100, y: 0 });
		expect(control.x).toBeCloseTo(50);
		expect(control.y).toBeCloseTo(-60);
	});

	test("negative sign (CLD) bulges a left-to-right link to the opposite side", () => {
		const control = connectionControlPoint({ x: 0, y: 0 }, { x: 100, y: 0 }, -1);
		expect(control.x).toBeCloseTo(50);
		expect(control.y).toBeCloseTo(60);
	});
});

describe("arcFromChordAndCentralAngle", () => {
	test("angle 0 yields a straight line segment", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			0,
		);
		expect(segment).toEqual({
			kind: "line",
			start: { x: 0, y: 0 },
			end: { x: 100, y: 0 },
		});
	});

	test("angle 90 over a 100px horizontal chord is a quarter circle bulging up", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			90,
		);
		if (segment.kind !== "arc") throw new Error("expected an arc");
		expect(segment.radius).toBeCloseTo(50 * Math.SQRT2, 6);
		expect(segment.center.x).toBeCloseTo(50, 6);
		expect(segment.center.y).toBeCloseTo(50, 6);
		const arcMidpoint = segmentPointAt(segment, 0.5);
		expect(arcMidpoint.x).toBeCloseTo(50, 6);
		expect(arcMidpoint.y).toBeCloseTo(-(50 * (Math.SQRT2 - 1)), 6);
	});

	test("negative angle bulges to the opposite side", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			-90,
		);
		if (segment.kind !== "arc") throw new Error("expected an arc");
		expect(segmentPointAt(segment, 0.5).y).toBeCloseTo(50 * (Math.SQRT2 - 1), 6);
	});

	test("arc endpoints land exactly on source and target", () => {
		const source = { x: 10, y: 20 };
		const target = { x: 70, y: -40 };
		const segment = arcFromChordAndCentralAngle(source, target, 60);
		expect(segmentStartPoint(segment).x).toBeCloseTo(source.x, 6);
		expect(segmentStartPoint(segment).y).toBeCloseTo(source.y, 6);
		expect(segmentEndPoint(segment).x).toBeCloseTo(target.x, 6);
		expect(segmentEndPoint(segment).y).toBeCloseTo(target.y, 6);
	});

	test("angle beyond 180 is clamped to a semicircle", () => {
		const clamped = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			720,
		);
		const semicircle = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			180,
		);
		expect(clamped).toEqual(semicircle);
	});

	test("zero-length chord degenerates to a line without dividing by zero", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 5, y: 5 },
			{ x: 5, y: 5 },
			90,
		);
		expect(segment.kind).toBe("line");
	});
});

describe("segmentTangentAt", () => {
	test("line tangent points from start to end", () => {
		const tangent = segmentTangentAt(
			{ kind: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
			0.5,
		);
		expect(tangent).toEqual({ x: 10, y: 0 });
	});

	test("arc start tangent of a quarter circle points along the travel direction", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			90,
		);
		const tangent = segmentTangentAt(segment, 0);
		const tangentLength = Math.hypot(tangent.x, tangent.y);
		expect(tangent.x / tangentLength).toBeCloseTo(Math.SQRT1_2, 6);
		expect(tangent.y / tangentLength).toBeCloseTo(-Math.SQRT1_2, 6);
	});
});

describe("segmentConvexNormalAt", () => {
	test("arc normal points away from the center", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			90,
		);
		const normal = segmentConvexNormalAt(segment, 0.5);
		expect(normal.x).toBeCloseTo(0, 6);
		expect(normal.y).toBeCloseTo(-1, 6);
	});
});

describe("svgPathFromSegments", () => {
	test("line-only chain emits M and L", () => {
		expect(
			svgPathFromSegments([
				{ kind: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 20 } },
			]),
		).toBe("M 0 0 L 10 20");
	});

	test("arc emits an A command with radius and endpoint", () => {
		const segment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			90,
		);
		const path = svgPathFromSegments([segment]);
		expect(path.startsWith("M 0 0 A ")).toBe(true);
		expect(path).toContain(" 0 0 1 ");
		const pathParts = path.split(" ");
		expect(Number(pathParts[pathParts.length - 2])).toBeCloseTo(100, 6);
		expect(Number(pathParts[pathParts.length - 1])).toBeCloseTo(0, 6);
	});

	test("two-segment chain emits one M then one command per segment", () => {
		const departureSegment = arcFromChordAndCentralAngle(
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			60,
		);
		const arrivalSegment: PathSegment = {
			kind: "line",
			start: { x: 50, y: 0 },
			end: { x: 100, y: 20 },
		};
		const path = svgPathFromSegments([departureSegment, arrivalSegment]);
		expect(path.match(/M /g)).toHaveLength(1);
		expect(path).toContain(" A ");
		expect(path.endsWith("L 100 20")).toBe(true);
	});
});

function expectPointsClose(actual: Point, expected: Point) {
	expect(actual.x).toBeCloseTo(expected.x, 4);
	expect(actual.y).toBeCloseTo(expected.y, 4);
}

describe("arcThroughThreePoints", () => {
	test("arc passes through the via point", () => {
		const source = { x: 0, y: 0 };
		const via = { x: 50, y: -30 };
		const target = { x: 100, y: 0 };
		const segment = arcThroughThreePoints(source, via, target);
		if (segment.kind !== "arc") throw new Error("expected an arc");
		expectPointsClose(segmentStartPoint(segment), source);
		expectPointsClose(segmentEndPoint(segment), target);
		expectPointsClose(segmentPointAt(segment, 0.5), via);
	});

	test("via on the far side yields the major arc that still passes through it", () => {
		const source = { x: 0, y: 0 };
		const via = { x: 50, y: 120 };
		const target = { x: 100, y: 0 };
		const segment = arcThroughThreePoints(source, via, target);
		if (segment.kind !== "arc") throw new Error("expected an arc");
		expectPointsClose(segmentPointAt(segment, 0.5), via);
	});

	test("collinear points degenerate to a straight line", () => {
		const segment = arcThroughThreePoints(
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 100, y: 0 },
		);
		expect(segment).toEqual({
			kind: "line",
			start: { x: 0, y: 0 },
			end: { x: 100, y: 0 },
		});
	});
});

describe("tangentContinuationArc", () => {
	test("east tangent to a diagonal target sweeps a quarter circle", () => {
		const segment = tangentContinuationArc(
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 100, y: 100 },
		);
		if (segment.kind !== "arc") throw new Error("expected an arc");
		expectPointsClose(segment.center, { x: 0, y: 100 });
		expect(segment.radius).toBeCloseTo(100, 6);
		expectPointsClose(segmentEndPoint(segment), { x: 100, y: 100 });
	});

	test("tangent aimed straight at the target degenerates to a line", () => {
		const segment = tangentContinuationArc(
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 50, y: 50 },
		);
		expect(segment).toEqual({
			kind: "line",
			start: { x: 0, y: 0 },
			end: { x: 50, y: 50 },
		});
	});
});

describe("connectionRoutedSegments", () => {
	test("no hints returns null", () => {
		expect(
			connectionRoutedSegments({ x: 0, y: 0 }, { x: 100, y: 0 }, {}),
		).toBeNull();
	});

	test("angle-only routes a single arc", () => {
		const segments = connectionRoutedSegments(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ angle: 45 },
		);
		expect(segments).toHaveLength(1);
		expect(segments?.[0].kind).toBe("arc");
	});

	test("via-only routes a single arc through the waypoint", () => {
		const via = { x: 50, y: -40 };
		const segments = connectionRoutedSegments(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ via },
		);
		expect(segments).toHaveLength(1);
		if (!segments) throw new Error("expected segments");
		expectPointsClose(segmentPointAt(segments[0], 0.5), via);
	});

	test("angle plus via is a two-segment chain with equal tangents at via", () => {
		const source = { x: 0, y: 0 };
		const via = { x: 80, y: -60 };
		const target = { x: 200, y: 20 };
		const segments = connectionRoutedSegments(source, target, {
			angle: 50,
			via,
		});
		expect(segments).toHaveLength(2);
		if (!segments) throw new Error("expected segments");
		expectPointsClose(segmentEndPoint(segments[0]), via);
		expectPointsClose(segmentStartPoint(segments[1]), via);
		expectPointsClose(segmentEndPoint(segments[1]), target);
		const departureTangent = segmentTangentAt(segments[0], 1);
		const arrivalTangent = segmentTangentAt(segments[1], 0);
		const departureLength = Math.hypot(departureTangent.x, departureTangent.y);
		const arrivalLength = Math.hypot(arrivalTangent.x, arrivalTangent.y);
		expect(departureTangent.x / departureLength).toBeCloseTo(
			arrivalTangent.x / arrivalLength,
			4,
		);
		expect(departureTangent.y / departureLength).toBeCloseTo(
			arrivalTangent.y / arrivalLength,
			4,
		);
	});

	test("angle 0 plus via routes a straight leg then a tangent-continuous arc", () => {
		const segments = connectionRoutedSegments(
			{ x: 0, y: 0 },
			{ x: 100, y: 100 },
			{ angle: 0, via: { x: 60, y: 0 } },
		);
		expect(segments).toHaveLength(2);
		expect(segments?.[0].kind).toBe("line");
		expect(segments?.[1].kind).toBe("arc");
	});

	test("via coincident with an endpoint is ignored", () => {
		const segments = connectionRoutedSegments(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ via: { x: 0.2, y: 0 } },
		);
		expect(segments).toBeNull();
	});

	test("via coincident with an endpoint still honors an explicit angle", () => {
		const segments = connectionRoutedSegments(
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ angle: 30, via: { x: 100, y: 0.5 } },
		);
		expect(segments).toHaveLength(1);
		expect(segments?.[0].kind).toBe("arc");
	});
});
