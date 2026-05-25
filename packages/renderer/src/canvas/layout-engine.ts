import type { IR, IRStock, IRFlow, IRAuxiliary, IRPosition } from "@sysdml/ir";

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
	buildSFDLayout(ir);
	return ir.stocks.length > 0 ? buildSFDLayout(ir) : layoutCLD(ir);
	// return ir.stocks.length > 0 ? buildSFDLayout(ir) : layoutCLD(ir);
}

// function getLayoutNode(id: string, kind: NodeKind, x: number, y: number): LayoutNode {
//   return { id, kind, x, y, width: calculateNodeWidth(id.length), height: NODE_SIZE[kind].height };
// }

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

	// TOTO - constructAuxiliaryNodes.entries()

	return layoutNodes;
}

// function constructLayoutEdges(
// directionalAdjacencyMap: Map<string, DirectionalSet>,
// ): Map<string, LayoutEdge> {
// 	const edges = new Map<string, LayoutEdge>();

// 	return edges;
// }

function contructAuxiliaryNodes(
	directionalAdjacencyMap: Map<string, DirectionalSet>,
	auxiliaries: IRAuxiliary[],
) {
	// Extend the directionalAdjacencyMap with auxilaries
	// constructLayoutNode with positions generated through fruchterman-reingold force-directed algorithm
	return;
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
	const nodes = new Map<string, LayoutNode>(
		buildSkeleton(ir.stocks, ir.flows).entries(),
	);

	const edges = new Map<string, LayoutEdge>();

	return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

// function layoutSFD(ir: IR): LayoutResult {
//   const OFFSET = 200;
//   const nodes = new Map<string, LayoutNode>();
//   const edges = new Map<string, LayoutEdge>();

//   type Tagged =
//     | (IRStock & { kind: "stock" })
//     | (IRFlow & { kind: "flow" })
//     | (IRAuxiliary & { kind: "aux" });

//   const nodeMap = new Map<string, Tagged>();
//   ir.stocks.forEach((s) => nodeMap.set(s.id, { ...s, kind: "stock" }));
//   ir.flows.forEach((f) => nodeMap.set(f.id, { ...f, kind: "flow" }));
//   ir.auxiliaries.forEach((a) => nodeMap.set(a.id, { ...a, kind: "aux" }));

//   let stockCount = 0;
//   for (const node of nodeMap.values()) {
//     if (node.kind === "stock") {
//       const x = node.position?.x ?? stockCount * 2 * OFFSET;
//       const y = node.position?.y ?? 0;
//       nodes.set(node.id, getLayoutNode(node.id, "stock", x, y));
//       stockCount++;
//     }

//     if (node.kind === "flow") {
//       const from = node.from ? nodes.get(node.from) : null;
//       const to = node.to ? nodes.get(node.to) : null;
//       const algorithmX = from
//         ? from.x + OFFSET + from.width / 2
//         : to
//           ? to.x - OFFSET
//           : 0;
//       const algorithmY = from?.y ?? to?.y ?? 0;
//       const x = node.position?.x ?? algorithmX;
//       const y = node.position?.y ?? algorithmY;
//       nodes.set(node.id, getLayoutNode(node.id, "flow", x, y));

//       edges.set(node.id, {
//         id: node.id,
//         kind: "flow",
//         source: node.from ?? node.id,
//         target: node.to ?? node.id,
//         points: [
//           { x: to?.x ?? x, y: to?.y ?? y },
//           { x: from?.x ?? x, y: from?.y ?? y },
//         ],
//       });
//     }

//     if (node.kind === "aux") {
//       const related = ir.connections
//         .filter((c) => c.from === node.id || c.to === node.id)
//         .map((c) => (c.from === node.id ? c.to : c.from));
//       const xs = related.map((id) => nodes.get(id)?.x).filter((v): v is number => v !== undefined);
//       const ys = related.map((id) => nodes.get(id)?.y).filter((v): v is number => v !== undefined);
//       const algorithmX = xs.length ? xs.reduce((a, b) => a + b) / xs.length : 0;
//       const algorithmY = (ys.length ? ys.reduce((a, b) => a + b) / ys.length : 0) - OFFSET / 2;
//       const x = node.position?.x ?? algorithmX;
//       const y = node.position?.y ?? algorithmY;
//       nodes.set(node.id, getLayoutNode(node.id, "aux", x, y));
//     }
//   }

//   ir.connections.forEach((conn) => {
//     const edgeId = `${conn.from}_to_${conn.to}`;
//     const src = nodes.get(conn.from);
//     const tgt = nodes.get(conn.to);
//     edges.set(edgeId, {
//       id: edgeId,
//       kind: "connection",
//       source: conn.from,
//       target: conn.to,
//       polarity: conn.polarity,
//       points: [
//         { x: src?.x ?? 0, y: src?.y ?? 0 },
//         { x: tgt?.x ?? 0, y: tgt?.y ?? 0 },
//       ],
//     });
//   });

//   return { nodes: [...nodes.values()], edges: [...edges.values()] };
// }

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
			getLayoutNode(
				node.id,
				kind,
				node.position?.x ?? algorithmX,
				node.position?.y ?? algorithmY,
			),
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
