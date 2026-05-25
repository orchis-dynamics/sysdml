import type { IR, IRStock, IRFlow, IRPosition } from "@sysdml/ir";

import { constructAuxiliaryLayoutNodes } from "./layout-auxiliaries";
import { constructLayoutEdges } from "./layout-edges";
import { THEME } from "./layout-theme";
import {
	LayoutEdge,
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

function layoutCLD(ir: IR): LayoutResult {
	const NODE_SIZE: Record<NodeKind, { width: number; height: number }> = {
		stock: { width: 120, height: 48 },
		aux: { width: 80, height: 32 },
		flow: { width: 20, height: 20 },
	};

	const nodes: LayoutNode[] = [];
	const edges: LayoutEdge[] = [];

	const allNodes = [...ir.auxiliaries, ...ir.stocks];
	const n = allNodes.length;
	const radius = Math.max(120, n * 35);
	const cx = radius + THEME.SPACING + NODE_SIZE.aux.width / 2;
	const cy = radius + THEME.SPACING + NODE_SIZE.aux.height / 2;

	allNodes.forEach((node, i) => {
		const angle = (2 * Math.PI * i) / n - Math.PI / 2;
		const isStock = ir.stocks.some((s) => s.id === node.id);
		const kind: NodeKind = isStock ? "stock" : "aux";
		const algorithmX =
			cx + radius * Math.cos(angle) - NODE_SIZE[kind].width / 2;
		const algorithmY =
			cy + radius * Math.sin(angle) - NODE_SIZE[kind].height / 2;
		nodes.push(
			constructLayoutNode(node.id, kind, {
				x: node.position?.x ?? algorithmX,
				y: node.position?.y ?? algorithmY,
			}),
		);
	});

	for (const c of ir.connections) {
		edges.push({
			id: `conn-${c.from}-${c.to}`,
			kind: "connection",
			source: c.from,
			target: c.to,
			polarity: c.polarity,
			points: [],
		});
	}

	return { nodes, edges };
}
