export type Point = { x: number; y: number };

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
	const angleRadians = segment.startAngleRadians + t * segment.deltaAngleRadians;
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
	const startAngleRadians = Math.atan2(source.y - center.y, source.x - center.x);
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
