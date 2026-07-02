import type { IRConnection, IRPosition } from "@sysdml/contracts";

import { FR, THEME } from "./layout-theme";
import { LayoutInputNode, LayoutNode, NodeKindEnum } from "./layout-types";

export function seedAuxiliaryPositions(
	auxiliaries: LayoutInputNode[],
	connections: IRConnection[],
	skeletonNodes: Map<string, LayoutNode>,
): Map<string, IRPosition> {
	const skeletonCenter = computeSkeletonCenter(skeletonNodes);
	const seeds = new Map<string, IRPosition>();

	auxiliaries.forEach((auxiliary) => {
		if (auxiliary.position) {
			seeds.set(auxiliary.id, auxiliary.position);
			return;
		}

		const neighborPositions = collectNeighborPositions(
			auxiliary.id,
			connections,
			skeletonNodes,
		);

		seeds.set(
			auxiliary.id,
			neighborPositions.length > 0
				? averagePositions(neighborPositions)
				: skeletonCenter,
		);
	});

	return seeds;
}

function collectNeighborPositions(
	auxiliaryId: string,
	connections: IRConnection[],
	skeletonNodes: Map<string, LayoutNode>,
): IRPosition[] {
	const positions: IRPosition[] = [];
	connections.forEach((connection) => {
		const neighborId = getOtherEndpoint(connection, auxiliaryId);
		if (neighborId === null) return;
		const neighbor = skeletonNodes.get(neighborId);
		if (neighbor) positions.push(nodeCenter(neighbor));
	});
	return positions;
}

function getOtherEndpoint(
	connection: IRConnection,
	nodeId: string,
): string | null {
	if (connection.from === nodeId) return connection.to;
	if (connection.to === nodeId) return connection.from;
	return null;
}

function nodeCenter(node: LayoutNode): IRPosition {
	return {
		x: node.position.x + node.size.width / 2,
		y: node.position.y + node.size.height / 2,
	};
}

function averagePositions(positions: IRPosition[]): IRPosition {
	const sum = positions.reduce(
		(accumulator, position) => ({
			x: accumulator.x + position.x,
			y: accumulator.y + position.y,
		}),
		{ x: 0, y: 0 },
	);
	return { x: sum.x / positions.length, y: sum.y / positions.length };
}

function computeSkeletonCenter(
	skeletonNodes: Map<string, LayoutNode>,
): IRPosition {
	if (skeletonNodes.size === 0) return { x: 0, y: 0 };
	const centers = [...skeletonNodes.values()].map(nodeCenter);
	return averagePositions(centers);
}

const COINCIDENT_EPSILON = 1e-6;

export function computeRepulsion(
	positions: Map<string, IRPosition>,
	k: number,
): Map<string, IRPosition> {
	const displacement = initializeDisplacement(positions);
	const ids = [...positions.keys()];

	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			const idA = ids[i];
			const idB = ids[j];
			const { unitX, unitY, distance } = unitVectorBetween(
				positions.get(idA)!,
				positions.get(idB)!,
				idA,
				idB,
			);
			const magnitude = (k * k) / distance;
			const repulsionA = displacement.get(idA)!;
			const repulsionB = displacement.get(idB)!;
			repulsionA.x += unitX * magnitude;
			repulsionA.y += unitY * magnitude;
			repulsionB.x -= unitX * magnitude;
			repulsionB.y -= unitY * magnitude;
		}
	}

	return displacement;
}

interface UnitVector {
	unitX: number;
	unitY: number;
	distance: number;
}

function unitVectorBetween(
	positionA: IRPosition,
	positionB: IRPosition,
	idA: string,
	idB: string,
): UnitVector {
	const deltaX = positionA.x - positionB.x;
	const deltaY = positionA.y - positionB.y;
	const distance = Math.hypot(deltaX, deltaY);
	if (distance < COINCIDENT_EPSILON) {
		// Jitter coincident nodes with a deterministic unit vector derived
		// from their ids so results are reproducible across runs.
		const angle = hashAngle(idA + idB);
		return {
			unitX: Math.cos(angle),
			unitY: Math.sin(angle),
			distance: COINCIDENT_EPSILON,
		};
	}
	return { unitX: deltaX / distance, unitY: deltaY / distance, distance };
}

function initializeDisplacement(
	positions: Map<string, IRPosition>,
): Map<string, IRPosition> {
	const displacement = new Map<string, IRPosition>();
	positions.forEach((_, id) => displacement.set(id, { x: 0, y: 0 }));
	return displacement;
}

function hashAngle(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	// Map to [0, 2π)
	return ((hash >>> 0) / 0xffffffff) * Math.PI * 2;
}

export interface DisplacementApplication {
	positions: Map<string, IRPosition>;
	maxStep: number;
}

export function applyDisplacement(
	positions: Map<string, IRPosition>,
	displacement: Map<string, IRPosition>,
	pinned: Set<string>,
	temperature: number,
): DisplacementApplication {
	const next = new Map<string, IRPosition>();
	let maxStep = 0;

	positions.forEach((position, id) => {
		if (pinned.has(id)) {
			next.set(id, position);
			return;
		}
		const stepVector = displacement.get(id) ?? { x: 0, y: 0 };
		const length = Math.hypot(stepVector.x, stepVector.y);
		if (length < COINCIDENT_EPSILON) {
			next.set(id, position);
			return;
		}
		const clamped = Math.min(length, temperature);
		const stepX = (stepVector.x / length) * clamped;
		const stepY = (stepVector.y / length) * clamped;
		next.set(id, { x: position.x + stepX, y: position.y + stepY });
		if (clamped > maxStep) maxStep = clamped;
	});

	return { positions: next, maxStep };
}

export interface FrEdge {
	from: string;
	to: string;
}

export function computeAttraction(
	positions: Map<string, IRPosition>,
	edges: FrEdge[],
	k: number,
): Map<string, IRPosition> {
	const displacement = initializeDisplacement(positions);

	edges.forEach((edge) => {
		const positionFrom = positions.get(edge.from);
		const positionTo = positions.get(edge.to);
		if (!positionFrom || !positionTo) return;

		const deltaX = positionFrom.x - positionTo.x;
		const deltaY = positionFrom.y - positionTo.y;
		const distance = Math.hypot(deltaX, deltaY);
		if (distance < COINCIDENT_EPSILON) return;

		const unitX = deltaX / distance;
		const unitY = deltaY / distance;
		const magnitude = (distance * distance) / k;

		const dFrom = displacement.get(edge.from)!;
		const dTo = displacement.get(edge.to)!;
		dFrom.x -= unitX * magnitude;
		dFrom.y -= unitY * magnitude;
		dTo.x += unitX * magnitude;
		dTo.y += unitY * magnitude;
	});

	return displacement;
}

export function constructAuxiliaryLayoutNodes(
	auxiliaries: LayoutInputNode[],
	connections: IRConnection[],
	skeletonNodes: Map<string, LayoutNode>,
): Map<string, LayoutNode> {
	if (auxiliaries.length === 0) return new Map();

	const seeds = seedAuxiliaryPositions(auxiliaries, connections, skeletonNodes);

	// Combined position map: aux seeds + skeleton centers (pinned).
	const positions = new Map<string, IRPosition>(seeds);
	const pinned = new Set<string>();
	skeletonNodes.forEach((node, id) => {
		positions.set(id, nodeCenter(node));
		pinned.add(id);
	});

	const auxIdSet = new Set(auxiliaries.map((auxiliary) => auxiliary.id));
	const auxesWithExplicitPosition = new Set(
		auxiliaries
			.filter((auxiliary) => auxiliary.position)
			.map((auxiliary) => auxiliary.id),
	);
	auxesWithExplicitPosition.forEach((id) => pinned.add(id));

	// Edges = IR connections that touch at least one aux node.
	const frEdges: FrEdge[] = connections
		.filter(
			(connection) =>
				auxIdSet.has(connection.from) || auxIdSet.has(connection.to),
		)
		.map((connection) => ({ from: connection.from, to: connection.to }));

	const k = computeIdealEdgeLength(positions);
	let temperature = FR.INITIAL_TEMPERATURE;
	let currentPositions = positions;

	for (let iteration = 0; iteration < FR.MAX_ITERATIONS; iteration++) {
		const repulsion = computeRepulsion(currentPositions, k);
		const attraction = computeAttraction(currentPositions, frEdges, k);
		const combined = sumDisplacement(repulsion, attraction);
		const { positions: next, maxStep } = applyDisplacement(
			currentPositions,
			combined,
			pinned,
			temperature,
		);
		currentPositions = next;
		temperature *= FR.COOLING_FACTOR;
		if (maxStep < FR.EPSILON) break;
	}

	const result = new Map<string, LayoutNode>();
	auxiliaries.forEach((auxiliary) => {
		const position = currentPositions.get(auxiliary.id)!;
		const size = {
			width: auxiliary.id.length * THEME.CHAR_WIDTH + 2 * THEME.STOCK_PADDING,
			height: THEME.LINE_HEIGHT + 2 * THEME.STOCK_PADDING,
		};
		result.set(auxiliary.id, {
			id: auxiliary.id,
			kind: NodeKindEnum.Aux,
			position,
			size,
		});
	});

	return result;
}

function computeIdealEdgeLength(positions: Map<string, IRPosition>): number {
	if (positions.size === 0) {
		return FR.AREA_SIDE_FALLBACK / 2;
	}
	const xs = [...positions.values()].map((position) => position.x);
	const ys = [...positions.values()].map((position) => position.y);
	const width = Math.max(
		FR.AREA_SIDE_FALLBACK,
		Math.max(...xs) - Math.min(...xs),
	);
	const height = Math.max(
		FR.AREA_SIDE_FALLBACK,
		Math.max(...ys) - Math.min(...ys),
	);
	return Math.sqrt((width * height) / positions.size);
}

function sumDisplacement(
	displacementA: Map<string, IRPosition>,
	displacementB: Map<string, IRPosition>,
): Map<string, IRPosition> {
	const sum = new Map<string, IRPosition>();
	displacementA.forEach((value, id) => {
		const other = displacementB.get(id) ?? { x: 0, y: 0 };
		sum.set(id, { x: value.x + other.x, y: value.y + other.y });
	});
	displacementB.forEach((value, id) => {
		if (!sum.has(id)) sum.set(id, { ...value });
	});
	return sum;
}
