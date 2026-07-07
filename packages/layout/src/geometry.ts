export type Point = { x: number; y: number };

const ROUTING_EPSILON = 1e-6;

export function arePointsEqual(a: Point, b: Point): boolean {
	return (
		Math.abs(a.x - b.x) < ROUTING_EPSILON &&
		Math.abs(a.y - b.y) < ROUTING_EPSILON
	);
}

export function orthogonalPipePoints(
	source: Point,
	viaPoints: Point[],
	target: Point,
): Point[] {
	const anchors = [source, ...viaPoints, target];
	const pipePoints: Point[] = [anchors[0]];
	for (let anchorIndex = 1; anchorIndex < anchors.length; anchorIndex++) {
		const previous = pipePoints[pipePoints.length - 1];
		const next = anchors[anchorIndex];
		if (arePointsEqual(previous, next)) continue;
		if (previous.x !== next.x && previous.y !== next.y) {
			pipePoints.push({ x: next.x, y: previous.y });
		}
		pipePoints.push(next);
	}
	return pipePoints;
}

export function polylineMidpoint(points: Point[]): Point {
	const segmentLengths: number[] = [];
	let totalLength = 0;
	for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
		const segmentLength = Math.hypot(
			points[pointIndex].x - points[pointIndex - 1].x,
			points[pointIndex].y - points[pointIndex - 1].y,
		);
		segmentLengths.push(segmentLength);
		totalLength += segmentLength;
	}
	if (totalLength === 0) return points[0];
	let remainingLength = totalLength / 2;
	for (
		let segmentIndex = 0;
		segmentIndex < segmentLengths.length;
		segmentIndex++
	) {
		if (remainingLength <= segmentLengths[segmentIndex]) {
			const startPoint = points[segmentIndex];
			const endPoint = points[segmentIndex + 1];
			const fraction = remainingLength / segmentLengths[segmentIndex];
			return {
				x: startPoint.x + fraction * (endPoint.x - startPoint.x),
				y: startPoint.y + fraction * (endPoint.y - startPoint.y),
			};
		}
		remainingLength -= segmentLengths[segmentIndex];
	}
	return points[points.length - 1];
}
