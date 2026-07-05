import { orthogonalPipePoints, polylineMidpoint, type Point } from "@sysdml/layout";

export { orthogonalPipePoints, polylineMidpoint };
export type { Point };

export type Box = {
	position: Point;
	size: { width: number; height: number };
};

export function flowElbowCorner(source: Point, target: Point): Point | null {
	return source.y === target.y ? null : { x: target.x, y: source.y };
}

const CONNECTION_BULGE = 60;

// Walks from p0 toward p1 and returns the point where the segment first enters
// the axis-aligned box. Assumes p1 is inside (or on) the box; if p0 is also
// inside, returns p0 unchanged.
export function clipToBox(p0: Point, p1: Point, box: Box): Point {
	const minX = box.position.x;
	const maxX = box.position.x + box.size.width;
	const minY = box.position.y;
	const maxY = box.position.y + box.size.height;
	const dx = p1.x - p0.x;
	const dy = p1.y - p0.y;

	const tEnterX = dx === 0 ? -Infinity : ((dx > 0 ? minX : maxX) - p0.x) / dx;
	const tEnterY = dy === 0 ? -Infinity : ((dy > 0 ? minY : maxY) - p0.y) / dy;
	const tEnter = Math.max(tEnterX, tEnterY);
	const t = Math.min(1, Math.max(0, tEnter));
	return { x: p0.x + t * dx, y: p0.y + t * dy };
}

export function connectionControlPoint(
	source: Point,
	target: Point,
	bulgeSign: number = 1,
): Point {
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const bulgeScale = CONNECTION_BULGE / (Math.hypot(dx, dy) || 1);
	return {
		x: (source.x + target.x) / 2 + bulgeSign * dy * bulgeScale,
		y: (source.y + target.y) / 2 - bulgeSign * dx * bulgeScale,
	};
}

export type LineSegment = {
	kind: "line";
	start: Point;
	end: Point;
};

export type ArcSegment = {
	kind: "arc";
	center: Point;
	radius: number;
	startAngleRadians: number;
	deltaAngleRadians: number;
};

export type PathSegment = LineSegment | ArcSegment;

const ROUTING_EPSILON = 1e-6;

function pointOnCircle(
	center: Point,
	radius: number,
	angleRadians: number,
): Point {
	return {
		x: center.x + radius * Math.cos(angleRadians),
		y: center.y + radius * Math.sin(angleRadians),
	};
}

export function segmentStartPoint(segment: PathSegment): Point {
	if (segment.kind === "line") return segment.start;
	return pointOnCircle(
		segment.center,
		segment.radius,
		segment.startAngleRadians,
	);
}

export function segmentEndPoint(segment: PathSegment): Point {
	if (segment.kind === "line") return segment.end;
	return pointOnCircle(
		segment.center,
		segment.radius,
		segment.startAngleRadians + segment.deltaAngleRadians,
	);
}

export function segmentPointAt(segment: PathSegment, t: number): Point {
	if (segment.kind === "line") {
		return {
			x: segment.start.x + t * (segment.end.x - segment.start.x),
			y: segment.start.y + t * (segment.end.y - segment.start.y),
		};
	}
	return pointOnCircle(
		segment.center,
		segment.radius,
		segment.startAngleRadians + t * segment.deltaAngleRadians,
	);
}

export function segmentTangentAt(segment: PathSegment, t: number): Point {
	if (segment.kind === "line") {
		return {
			x: segment.end.x - segment.start.x,
			y: segment.end.y - segment.start.y,
		};
	}
	const angleRadians =
		segment.startAngleRadians + t * segment.deltaAngleRadians;
	const sweepSign = Math.sign(segment.deltaAngleRadians) || 1;
	return {
		x: -Math.sin(angleRadians) * sweepSign,
		y: Math.cos(angleRadians) * sweepSign,
	};
}

export function segmentConvexNormalAt(segment: PathSegment, t: number): Point {
	if (segment.kind === "arc") {
		const point = segmentPointAt(segment, t);
		const radius = segment.radius || 1;
		return {
			x: (point.x - segment.center.x) / radius,
			y: (point.y - segment.center.y) / radius,
		};
	}
	const tangent = segmentTangentAt(segment, t);
	const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
	return { x: tangent.y / tangentLength, y: -tangent.x / tangentLength };
}

function clampAngleDegrees(angleDegrees: number): number {
	return Math.min(180, Math.max(-180, angleDegrees));
}

export function arcFromChordAndCentralAngle(
	source: Point,
	target: Point,
	centralAngleDegrees: number,
): PathSegment {
	const clampedDegrees = clampAngleDegrees(centralAngleDegrees);
	const chordX = target.x - source.x;
	const chordY = target.y - source.y;
	const chordLength = Math.hypot(chordX, chordY);
	if (
		Math.abs(clampedDegrees) < ROUTING_EPSILON ||
		chordLength < ROUTING_EPSILON
	) {
		return { kind: "line", start: source, end: target };
	}
	const deltaAngleRadians = (clampedDegrees * Math.PI) / 180;
	const halfAngleRadians = Math.abs(deltaAngleRadians) / 2;
	const radius = chordLength / (2 * Math.sin(halfAngleRadians));
	const leftUnitX = chordY / chordLength;
	const leftUnitY = -chordX / chordLength;
	const bulgeSign = Math.sign(clampedDegrees);
	const centerDistance = radius * Math.cos(halfAngleRadians);
	const center = {
		x: (source.x + target.x) / 2 - bulgeSign * leftUnitX * centerDistance,
		y: (source.y + target.y) / 2 - bulgeSign * leftUnitY * centerDistance,
	};
	const startAngleRadians = Math.atan2(
		source.y - center.y,
		source.x - center.x,
	);
	return { kind: "arc", center, radius, startAngleRadians, deltaAngleRadians };
}

export function svgPathFromSegments(segments: PathSegment[]): string {
	if (segments.length === 0) return "";
	const start = segmentStartPoint(segments[0]);
	const pathParts = [`M ${start.x} ${start.y}`];
	segments.forEach((segment) => {
		const end = segmentEndPoint(segment);
		if (segment.kind === "line") {
			pathParts.push(`L ${end.x} ${end.y}`);
			return;
		}
		const largeArcFlag = Math.abs(segment.deltaAngleRadians) > Math.PI ? 1 : 0;
		const sweepFlag = segment.deltaAngleRadians > 0 ? 1 : 0;
		pathParts.push(
			`A ${segment.radius} ${segment.radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`,
		);
	});
	return pathParts.join(" ");
}

const COLLINEARITY_TOLERANCE_PIXELS = 0.5;
const VIA_ENDPOINT_TOLERANCE_PIXELS = 1;
const FULL_TURN_RADIANS = 2 * Math.PI;

function normalizeAnglePositive(angleRadians: number): number {
	const normalized = angleRadians % FULL_TURN_RADIANS;
	return normalized < 0 ? normalized + FULL_TURN_RADIANS : normalized;
}

function circumcenter(a: Point, b: Point, c: Point): Point {
	const doubledSignedArea =
		2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
	const aSquared = a.x * a.x + a.y * a.y;
	const bSquared = b.x * b.x + b.y * b.y;
	const cSquared = c.x * c.x + c.y * c.y;
	return {
		x:
			(aSquared * (b.y - c.y) +
				bSquared * (c.y - a.y) +
				cSquared * (a.y - b.y)) /
			doubledSignedArea,
		y:
			(aSquared * (c.x - b.x) +
				bSquared * (a.x - c.x) +
				cSquared * (b.x - a.x)) /
			doubledSignedArea,
	};
}

export function arcThroughThreePoints(
	source: Point,
	via: Point,
	target: Point,
): PathSegment {
	const chordX = target.x - source.x;
	const chordY = target.y - source.y;
	const chordLength = Math.hypot(chordX, chordY);
	const crossProduct =
		(via.x - source.x) * chordY - (via.y - source.y) * chordX;
	const viaDistanceFromChord =
		chordLength < ROUTING_EPSILON ? 0 : Math.abs(crossProduct) / chordLength;
	if (viaDistanceFromChord < COLLINEARITY_TOLERANCE_PIXELS) {
		return { kind: "line", start: source, end: target };
	}
	const center = circumcenter(source, via, target);
	const radius = Math.hypot(source.x - center.x, source.y - center.y);
	const startAngleRadians = Math.atan2(
		source.y - center.y,
		source.x - center.x,
	);
	const endAngleRadians = Math.atan2(target.y - center.y, target.x - center.x);
	const viaAngleRadians = Math.atan2(via.y - center.y, via.x - center.x);
	const positiveSweep = normalizeAnglePositive(
		endAngleRadians - startAngleRadians,
	);
	const viaOffset = normalizeAnglePositive(viaAngleRadians - startAngleRadians);
	const deltaAngleRadians =
		viaOffset <= positiveSweep
			? positiveSweep
			: positiveSweep - FULL_TURN_RADIANS;
	return { kind: "arc", center, radius, startAngleRadians, deltaAngleRadians };
}

export function tangentContinuationArc(
	via: Point,
	tangentDirection: Point,
	target: Point,
): PathSegment {
	const tangentLength = Math.hypot(tangentDirection.x, tangentDirection.y);
	const chordX = target.x - via.x;
	const chordY = target.y - via.y;
	const chordLength = Math.hypot(chordX, chordY);
	if (tangentLength < ROUTING_EPSILON || chordLength < ROUTING_EPSILON) {
		return { kind: "line", start: via, end: target };
	}
	const tangentUnitX = tangentDirection.x / tangentLength;
	const tangentUnitY = tangentDirection.y / tangentLength;
	const targetDistanceFromTangentLine =
		tangentUnitX * chordY - tangentUnitY * chordX;
	if (Math.abs(targetDistanceFromTangentLine) < COLLINEARITY_TOLERANCE_PIXELS) {
		return { kind: "line", start: via, end: target };
	}
	const signedCenterDistance =
		(chordLength * chordLength) / (2 * targetDistanceFromTangentLine);
	const center = {
		x: via.x - tangentUnitY * signedCenterDistance,
		y: via.y + tangentUnitX * signedCenterDistance,
	};
	const radius = Math.abs(signedCenterDistance);
	const startAngleRadians = Math.atan2(via.y - center.y, via.x - center.x);
	const endAngleRadians = Math.atan2(target.y - center.y, target.x - center.x);
	const radiusUnitX = (via.x - center.x) / radius;
	const radiusUnitY = (via.y - center.y) / radius;
	const positiveSweepTangentX = -radiusUnitY;
	const positiveSweepTangentY = radiusUnitX;
	const sweepSign =
		tangentUnitX * positiveSweepTangentX +
			tangentUnitY * positiveSweepTangentY >=
		0
			? 1
			: -1;
	const positiveSweep = normalizeAnglePositive(
		endAngleRadians - startAngleRadians,
	);
	const deltaAngleRadians =
		sweepSign > 0 ? positiveSweep : positiveSweep - FULL_TURN_RADIANS;
	return { kind: "arc", center, radius, startAngleRadians, deltaAngleRadians };
}

export type ConnectionRoutingHints = {
	angle?: number;
	via?: Point;
};

function isUsableViaPoint(
	via: Point | undefined,
	source: Point,
	target: Point,
): via is Point {
	if (!via) return false;
	return (
		Math.hypot(via.x - source.x, via.y - source.y) >=
			VIA_ENDPOINT_TOLERANCE_PIXELS &&
		Math.hypot(via.x - target.x, via.y - target.y) >=
			VIA_ENDPOINT_TOLERANCE_PIXELS
	);
}

export function connectionRoutedSegments(
	source: Point,
	target: Point,
	hints: ConnectionRoutingHints,
): PathSegment[] | null {
	const angle = hints.angle;
	const via = isUsableViaPoint(hints.via, source, target)
		? hints.via
		: undefined;
	if (via !== undefined && angle !== undefined) {
		const departureSegment = arcFromChordAndCentralAngle(source, via, angle);
		const viaTangent = segmentTangentAt(departureSegment, 1);
		const arrivalSegment = tangentContinuationArc(via, viaTangent, target);
		return [departureSegment, arrivalSegment];
	}
	if (via !== undefined) {
		return [arcThroughThreePoints(source, via, target)];
	}
	if (angle !== undefined) {
		return [arcFromChordAndCentralAngle(source, target, angle)];
	}
	return null;
}

const CLIP_BISECTION_ITERATIONS = 25;

function isPointInsideBox(point: Point, box: Box): boolean {
	return (
		point.x >= box.position.x &&
		point.x <= box.position.x + box.size.width &&
		point.y >= box.position.y &&
		point.y <= box.position.y + box.size.height
	);
}

function truncateSegment(segment: PathSegment, t: number): PathSegment {
	if (segment.kind === "line") {
		return {
			kind: "line",
			start: segment.start,
			end: segmentPointAt(segment, t),
		};
	}
	return { ...segment, deltaAngleRadians: segment.deltaAngleRadians * t };
}

export function clipSegmentsEndToBox(
	segments: PathSegment[],
	box: Box,
): PathSegment[] {
	const keptSegments = [...segments];
	while (
		keptSegments.length > 1 &&
		isPointInsideBox(
			segmentStartPoint(keptSegments[keptSegments.length - 1]),
			box,
		)
	) {
		keptSegments.pop();
	}
	const finalSegment = keptSegments[keptSegments.length - 1];
	if (!isPointInsideBox(segmentEndPoint(finalSegment), box))
		return keptSegments;
	if (isPointInsideBox(segmentStartPoint(finalSegment), box))
		return keptSegments;
	let outsideT = 0;
	let insideT = 1;
	for (let iteration = 0; iteration < CLIP_BISECTION_ITERATIONS; iteration++) {
		const middleT = (outsideT + insideT) / 2;
		if (isPointInsideBox(segmentPointAt(finalSegment, middleT), box)) {
			insideT = middleT;
		} else {
			outsideT = middleT;
		}
	}
	keptSegments[keptSegments.length - 1] = truncateSegment(
		finalSegment,
		insideT,
	);
	return keptSegments;
}

export type RoutedConnection = {
	segments: PathSegment[];
	path: string;
};

export function routeConnection(
	source: Point,
	target: Point,
	box: Box | null,
	hints: ConnectionRoutingHints,
): RoutedConnection | null {
	const segments = connectionRoutedSegments(source, target, hints);
	if (!segments) return null;
	const clippedSegments = box ? clipSegmentsEndToBox(segments, box) : segments;
	return {
		segments: clippedSegments,
		path: svgPathFromSegments(clippedSegments),
	};
}

export type FlowPipeGeometry = {
	pipePath: string;
	arrowheadPoints: string;
};

const MIN_DRAG_ANGLE_DEGREES = 15;
const MAX_DRAG_ANGLE_DEGREES = 180;

export function centralAngleDegreesFromDragPoint(
	source: Point,
	target: Point,
	dragPoint: Point,
): number {
	const chordX = target.x - source.x;
	const chordY = target.y - source.y;
	const chordLength = Math.hypot(chordX, chordY);
	if (chordLength < ROUTING_EPSILON) return 0;
	const crossProduct =
		chordX * (dragPoint.y - source.y) - chordY * (dragPoint.x - source.x);
	const signedSagitta = -crossProduct / chordLength;
	return (4 * Math.atan((2 * signedSagitta) / chordLength) * 180) / Math.PI;
}

export function clampDragAngleDegrees(angleDegrees: number): number {
	const sign = angleDegrees >= 0 ? 1 : -1;
	const magnitude = Math.min(
		MAX_DRAG_ANGLE_DEGREES,
		Math.max(MIN_DRAG_ANGLE_DEGREES, Math.abs(Math.round(angleDegrees))),
	);
	return sign * magnitude;
}

export function viaDerivedCentralAngleDegrees(
	source: Point,
	via: Point,
	target: Point,
): number {
	const chordX = target.x - source.x;
	const chordY = target.y - source.y;
	const chordLength = Math.hypot(chordX, chordY);
	const crossProduct =
		(via.x - source.x) * chordY - (via.y - source.y) * chordX;
	const viaDistanceFromChord =
		chordLength < ROUTING_EPSILON ? 0 : Math.abs(crossProduct) / chordLength;
	if (viaDistanceFromChord < COLLINEARITY_TOLERANCE_PIXELS) return 0;
	const center = circumcenter(source, via, target);
	const startAngleRadians = Math.atan2(
		source.y - center.y,
		source.x - center.x,
	);
	const endAngleRadians = Math.atan2(target.y - center.y, target.x - center.x);
	const viaAngleRadians = Math.atan2(via.y - center.y, via.x - center.x);
	const positiveSweep = normalizeAnglePositive(
		endAngleRadians - startAngleRadians,
	);
	const viaOffset = normalizeAnglePositive(viaAngleRadians - startAngleRadians);
	const sourceToViaRadians =
		viaOffset <= positiveSweep ? viaOffset : viaOffset - FULL_TURN_RADIANS;
	return clampAngleDegrees(Math.round((sourceToViaRadians * 180) / Math.PI));
}

export function flowPipeGeometry(
	pipePoints: Point[],
	arrowheadLength: number,
	arrowheadHalfWidth: number,
): FlowPipeGeometry {
	const end = pipePoints[pipePoints.length - 1];
	const previousPoint = pipePoints[pipePoints.length - 2] ?? end;
	const deltaX = end.x - previousPoint.x;
	const deltaY = end.y - previousPoint.y;
	const segmentLength = Math.hypot(deltaX, deltaY) || 1;
	const directionX = deltaX / segmentLength;
	const directionY = deltaY / segmentLength;
	const pipeEndX = end.x - directionX * arrowheadLength;
	const pipeEndY = end.y - directionY * arrowheadLength;
	const interiorPoints = pipePoints.slice(1, -1);
	const pathParts = [
		`M ${pipePoints[0].x} ${pipePoints[0].y}`,
		...interiorPoints.map((point) => `L ${point.x} ${point.y}`),
		`L ${pipeEndX} ${pipeEndY}`,
	];
	const perpendicularX = -directionY;
	const perpendicularY = directionX;
	const baseLeftX = pipeEndX + perpendicularX * arrowheadHalfWidth;
	const baseLeftY = pipeEndY + perpendicularY * arrowheadHalfWidth;
	const baseRightX = pipeEndX - perpendicularX * arrowheadHalfWidth;
	const baseRightY = pipeEndY - perpendicularY * arrowheadHalfWidth;
	return {
		pipePath: pathParts.join(" "),
		arrowheadPoints: `${end.x},${end.y} ${baseLeftX},${baseLeftY} ${baseRightX},${baseRightY}`,
	};
}
