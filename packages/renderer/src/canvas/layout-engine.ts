import type { IR, IRStock, IRFlow, IRPosition, IRConnection } from "@sysdml/contracts";

import {
	orthogonalPipePoints,
	polylineMidpoint,
	type Point,
} from "./edge-geometry";
import { constructAuxiliaryLayoutNodes } from "./layout-auxiliaries";
import { constructLayoutEdges } from "./layout-edges";
import { THEME } from "./layout-theme";
import {
	LayoutInputNode,
	LayoutNode,
	LayoutResult,
	NodeKind,
	NodeKindEnum,
	NodeSize,
} from "./layout-types";

export function isCausalLoopDiagram(ir: IR): boolean {
	return ir.model.kind === "cld";
}

export function computeLayout(ir: IR): LayoutResult {
	return isCausalLoopDiagram(ir) ? buildLayoutCLD(ir) : buildLayoutSFD(ir);
}

const NODE_SIZE_CALC: Record<NodeKind, (idLength: number) => NodeSize> = {
	[NodeKindEnum.Stock]: (idLength: number) => ({
		width: idLength * THEME.CHAR_WIDTH + 2 * THEME.STOCK_PADDING,
		height: THEME.LINE_HEIGHT + 2 * THEME.STOCK_PADDING,
	}),
	[NodeKindEnum.Aux]: (idLength: number) => ({
		width: idLength * THEME.CHAR_WIDTH + 2 * THEME.STOCK_PADDING,
		height: THEME.LINE_HEIGHT + 2 * THEME.STOCK_PADDING,
	}),
	[NodeKindEnum.Flow]: () => ({
		width: THEME.FLOW_SIZE,
		height: THEME.FLOW_SIZE,
	}),
};

function constructLayoutNode(
	id: string,
	kind: NodeKind,
	position: IRPosition,
): LayoutNode {
	const size = NODE_SIZE_CALC[kind](id.length);

	return {
		id,
		kind,
		position,
		size,
	};
}

type DirectionalSet = {
	inputs: Array<string>;
	outputs: Array<string>;
	kind: NodeKind;
	position?: IRPosition;
};
function buildDirectionalAdjacencyMap(
	stocks: IRStock[],
	flows: IRFlow[],
): Map<string, DirectionalSet> {
	const directionalAdjacencyMap = new Map<string, DirectionalSet>();

	stocks.forEach((stock) =>
		directionalAdjacencyMap.set(stock.id, {
			inputs: [],
			outputs: [],
			kind: NodeKindEnum.Stock,
			position: stock.position,
		}),
	);

	flows.forEach((flow) => {
		if (!directionalAdjacencyMap.has(flow.id)) {
			const set: DirectionalSet = {
				inputs: flow.from ? [flow.from] : [],
				outputs: flow.to ? [flow.to] : [],
				kind: NodeKindEnum.Flow,
				position: flow.position,
			};

			directionalAdjacencyMap.set(flow.id, set);
		}

		if (flow.from)
			directionalAdjacencyMap.get(flow.from)?.outputs.push(flow.id);
		if (flow.to) directionalAdjacencyMap.get(flow.to)?.inputs.push(flow.id);
	});

	return directionalAdjacencyMap;
}

function constructSkeletonLayoutNodes(
	directionalAdjacencyMap: Map<string, DirectionalSet>,
	branches: Array<string[]>,
): Map<string, LayoutNode> {
	const layoutNodes = new Map<string, LayoutNode>();

	branches.forEach((branch, branchIterator) => {
		let x = 0;

		branch.forEach((nodeId) => {
			const node = directionalAdjacencyMap.get(nodeId);

			if (node) {
				const autoPlacedPosition = {
					x,
					y: branchIterator * THEME.SPACING,
				};
				const constructedNode = constructLayoutNode(
					nodeId,
					node.kind,
					node.position ?? autoPlacedPosition,
				);
				x =
					constructedNode.position.x +
					constructedNode.size.width +
					THEME.SPACING;

				layoutNodes.set(nodeId, constructedNode);
			}
		});
	});

	return layoutNodes;
}

function buildSkeleton(stocks: IRStock[], flows: IRFlow[]) {
	const directionalAdjacencyMap = buildDirectionalAdjacencyMap(stocks, flows);

	const entries = [...directionalAdjacencyMap.entries()];

	const graphHasTails = entries.some(([, value]) => value.inputs.length === 0);

	const branchEntries = graphHasTails
		? entries
				.filter(([_, value]) => value.inputs.length === 0)
				.map(([id]) => id)
		: entries.map(([id]) => id);

	const visitedBranches = new Set<string>();

	function collectBranch(startId: string): string[] {
		if (visitedBranches.has(startId)) return [];
		visitedBranches.add(startId);

		const node = directionalAdjacencyMap.get(startId);

		return node
			? [
					startId,
					...node.outputs.flatMap((outputId) => collectBranch(outputId)),
				]
			: [];
	}

	const branches = branchEntries.map((entry) => collectBranch(entry));
	return constructSkeletonLayoutNodes(directionalAdjacencyMap, branches);
}

function nodeCenterPoint(node: LayoutNode): Point {
	return {
		x: node.position.x + node.size.width / 2,
		y: node.position.y + node.size.height / 2,
	};
}

function repositionValvesOnPipePath(
	skeleton: Map<string, LayoutNode>,
	flows: IRFlow[],
): void {
	flows.forEach((flow) => {
		if (!flow.via || flow.via.length === 0 || flow.position) return;
		const valveNode = skeleton.get(flow.id);
		if (!valveNode) return;
		const sourceNode = flow.from ? skeleton.get(flow.from) : undefined;
		const targetNode = flow.to ? skeleton.get(flow.to) : undefined;
		const sourceCenter = sourceNode
			? nodeCenterPoint(sourceNode)
			: nodeCenterPoint(valveNode);
		const targetCenter = targetNode
			? nodeCenterPoint(targetNode)
			: nodeCenterPoint(valveNode);
		const pipeMidpoint = polylineMidpoint(
			orthogonalPipePoints(sourceCenter, flow.via, targetCenter),
		);
		valveNode.position = {
			x: pipeMidpoint.x - valveNode.size.width / 2,
			y: pipeMidpoint.y - valveNode.size.height / 2,
		};
	});
}

function buildLayoutSFD(ir: IR): LayoutResult {
	const skeleton = buildSkeleton(ir.stocks, ir.flows);
	repositionValvesOnPipePath(skeleton, ir.flows);
	const auxiliaryNodes = constructAuxiliaryLayoutNodes(
		ir.auxiliaries,
		ir.connections,
		skeleton,
	);

	const nodes = new Map<string, LayoutNode>([
		...skeleton.entries(),
		...auxiliaryNodes.entries(),
	]);

	const edges = constructLayoutEdges(ir.flows, ir.connections);

	return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function collectConnectionEndpoints(connections: IRConnection[]): string[] {
	const endpoints = new Set<string>();
	connections.forEach((connection) => {
		endpoints.add(connection.from);
		endpoints.add(connection.to);
	});
	return [...endpoints];
}

function buildLayoutCLD(ir: IR): LayoutResult {
	const inputNodesById = new Map<string, LayoutInputNode>();
	ir.auxiliaries.forEach((auxiliary) =>
		inputNodesById.set(auxiliary.id, {
			id: auxiliary.id,
			position: auxiliary.position,
		}),
	);
	collectConnectionEndpoints(ir.connections).forEach((endpointId) => {
		if (!inputNodesById.has(endpointId)) {
			inputNodesById.set(endpointId, { id: endpointId });
		}
	});

	const emptySkeleton = new Map<string, LayoutNode>();
	const auxiliaryNodes = constructAuxiliaryLayoutNodes(
		[...inputNodesById.values()],
		ir.connections,
		emptySkeleton,
	);

	const edges = constructLayoutEdges(ir.flows, ir.connections);

	return {
		nodes: [...auxiliaryNodes.values()],
		edges: [...edges.values()],
	};
}
