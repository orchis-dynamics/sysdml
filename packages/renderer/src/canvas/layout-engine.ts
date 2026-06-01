import type { IR, IRStock, IRFlow, IRPosition, IRConnection } from "@sysdml/ir";

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

export function computeLayout(ir: IR): LayoutResult {
	return ir.stocks.length > 0 ? buildSFDLayout(ir) : layoutCLD(ir);
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
		}),
	);

	flows.forEach((flow) => {
		if (!directionalAdjacencyMap.has(flow.id)) {
			const set: DirectionalSet = {
				inputs: flow.from ? [flow.from] : [],
				outputs: flow.to ? [flow.to] : [],
				kind: NodeKindEnum.Flow,
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
				const constructedNode = constructLayoutNode(nodeId, node.kind, {
					x,
					y: 0 + branchIterator * THEME.SPACING,
				});
				x += constructedNode.size.width + THEME.SPACING;

				layoutNodes.set(nodeId, constructedNode);
			}
		});
	});

	return layoutNodes;
}

function buildSkeleton(stocks: IRStock[], flows: IRFlow[]) {
	const directionalAdjacencyMap = buildDirectionalAdjacencyMap(stocks, flows);

	const entries = [...directionalAdjacencyMap.entries()];

	const graphHasTails = entries.find(([_, value]) => value.inputs.length === 0);

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

function buildSFDLayout(ir: IR): LayoutResult {
	const skeleton = buildSkeleton(ir.stocks, ir.flows);
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

function layoutCLD(ir: IR): LayoutResult {
	const endpointNodes: LayoutInputNode[] = collectConnectionEndpoints(
		ir.connections,
	).map((id) => ({ id }));

	const emptySkeleton = new Map<string, LayoutNode>();
	const auxiliaryNodes = constructAuxiliaryLayoutNodes(
		endpointNodes,
		ir.connections,
		emptySkeleton,
	);

	const edges = constructLayoutEdges(ir.flows, ir.connections);

	return {
		nodes: [...auxiliaryNodes.values()],
		edges: [...edges.values()],
	};
}
