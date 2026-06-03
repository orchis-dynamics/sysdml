import type { IRGraphicalFunction } from "@sysdml/contracts";

export function gfLookup(gf: IRGraphicalFunction, input: number): number {
	const xPoints = buildXPoints(gf);
	const yPoints = gf.ypts;
	const count = xPoints.length;

	if (count === 0) return 0;
	if (count === 1) return yPoints[0];

	return interpolate(gf.kind, xPoints, yPoints, input);
}

function buildXPoints(gf: IRGraphicalFunction): number[] {
	if (gf.xpts !== null) return gf.xpts;
	const [min, max] = gf.xscale!;
	const count = gf.ypts.length;
	return Array.from({ length: count }, (_, i) =>
		count === 1 ? min : min + (i * (max - min)) / (count - 1),
	);
}

function interpolate(
	kind: IRGraphicalFunction["kind"],
	xPoints: number[],
	yPoints: number[],
	input: number,
): number {
	const last = xPoints.length - 1;

	if (input <= xPoints[0])
		return extrapolateLeft(kind, xPoints, yPoints, input);
	if (input >= xPoints[last])
		return extrapolateRight(kind, xPoints, yPoints, input);

	const bracketIndex = findBracketIndex(xPoints, input);
	if (kind === "step") return yPoints[bracketIndex];
	return linearInterp(
		xPoints[bracketIndex],
		yPoints[bracketIndex],
		xPoints[bracketIndex + 1],
		yPoints[bracketIndex + 1],
		input,
	);
}

function extrapolateLeft(
	kind: IRGraphicalFunction["kind"],
	xPoints: number[],
	yPoints: number[],
	input: number,
): number {
	if (kind === "extra")
		return linearInterp(xPoints[0], yPoints[0], xPoints[1], yPoints[1], input);
	return yPoints[0];
}

function extrapolateRight(
	kind: IRGraphicalFunction["kind"],
	xPoints: number[],
	yPoints: number[],
	input: number,
): number {
	const last = xPoints.length - 1;
	if (kind === "extra")
		return linearInterp(
			xPoints[last - 1],
			yPoints[last - 1],
			xPoints[last],
			yPoints[last],
			input,
		);
	return yPoints[last];
}

function findBracketIndex(xPoints: number[], input: number): number {
	if (xPoints[0] > input) return 0;
	let lo = 0;
	let hi = xPoints.length - 2;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (xPoints[mid] <= input) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

function linearInterp(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x: number,
): number {
	if (x1 === x0) return y0;
	return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}
