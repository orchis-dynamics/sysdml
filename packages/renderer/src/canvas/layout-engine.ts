import type { IR, IRStock, IRFlow, IRAuxiliary, IRPosition } from "@sysdml/ir";

export enum NodeKindEnum {
  Stock = 'stock',
  Aux = 'aux',
  Flow = 'flow'
}
export type NodeKind = `${NodeKindEnum}`;
export type NodeSize = { width: number, height: number }

export interface LayoutNode {
  id: string;
  kind: NodeKind;
  position: IRPosition;
  size: NodeSize
}

export type EdgeKind = "flow" | "connection";

export interface LayoutEdge {
  id: string;
  kind: EdgeKind;
  source: string;
  target: string;
  polarity?: "+" | "-" | "=>";
  points: { x: number; y: number }[];
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

const NODE_SIZE: Record<NodeKind, { width: number; height: number }> = {
  stock: { width: 120, height: 48 },
  aux: { width: 80, height: 32 },
  flow: { width: 20, height: 20 },
};

const THEME = {
  NODE: {
    STOCK: {
      PADDING: 8,
      CHAR_WIDTH: 7.2,
      LINE_HEIGHT: 16
    }
  }
}

export function computeLayout(ir: IR): LayoutResult {
  buildSFDLayout(ir);
  return ir.stocks.length > 0 ? buildSFDLayout(ir) : layoutCLD(ir);
  // return ir.stocks.length > 0 ? buildSFDLayout(ir) : layoutCLD(ir);
}

const MARGIN = 80;

// function getLayoutNode(id: string, kind: NodeKind, x: number, y: number): LayoutNode {
//   return { id, kind, x, y, width: calculateNodeWidth(id.length), height: NODE_SIZE[kind].height };
// }
// Deterministic node sizing based on exact monospace font size and paddings
const CHAR_WIDTH = 7.2
const STOCK_PADDING = 8
const LINE_HEIGHT = 16
const FLOW_SIZE = 24

const NODE_SIZE_CALC: Record<NodeKind, (idLength: number) => NodeSize> = {
  [NodeKindEnum.Stock]: (idLength: number) => ({
    width: idLength * CHAR_WIDTH + 2 * STOCK_PADDING,
    height: LINE_HEIGHT + 2 * STOCK_PADDING
  }),
  // TODO - set correct sizing
  [NodeKindEnum.Aux]: (idLength: number) => ({
    width: idLength * CHAR_WIDTH + 2 * STOCK_PADDING,
    height: LINE_HEIGHT + 2 * STOCK_PADDING
  }),
  // TODO - set correct sizing
  [NodeKindEnum.Flow]: (idLength: number) => ({
    width: FLOW_SIZE,
    height: FLOW_SIZE
  })
}

function constructLayoutNode(id: string, kind: NodeKind, position: IRPosition): LayoutNode {
  const size = NODE_SIZE_CALC[kind](id.length)

  return {
    id,
    kind,
    position,
    size
  }
}

function buildStockSkeleton(stocks: IRStock[], flows: IRFlow[]) {
  const layoutNodes = new Map<string, LayoutNode>();
  type DirectionalSet = { inputs: Array<string>, outputs: Array<string>, kind: NodeKind }
  const directionalAdjacencyMap = new Map<string, DirectionalSet>()

  stocks.forEach((stock) => directionalAdjacencyMap.set(stock.id, { inputs: [], outputs: [], kind: NodeKindEnum.Stock }))
  flows.forEach((flow) => {
    console.log(flow.id)
    if (!directionalAdjacencyMap.has(flow.id)) {
      const set: DirectionalSet = { inputs: [], outputs: [], kind: NodeKindEnum.Flow }
      if (flow.from) set.inputs.push(flow.from)
      if (flow.to) set.outputs.push(flow.to)

      directionalAdjacencyMap.set(flow.id, set)
    }

    if (flow.from) directionalAdjacencyMap.get(flow.from)?.outputs.push(flow.id)
    if (flow.to) directionalAdjacencyMap.get(flow.to)?.inputs.push(flow.id)
  })

  const branchEntries = [...directionalAdjacencyMap.entries()].filter(([_, value]) => value.inputs.length === 0).map(([id]) => id)

  if (branchEntries && branchEntries.length > 0) {
    const visitedBranches = new Set<string>()

    function collectBranch(startId: string): string[] {
      if (visitedBranches.has(startId)) return []
      visitedBranches.add(startId)

      const node = directionalAdjacencyMap.get(startId)
      if (!node) return []

      return [startId, ...node.outputs.flatMap((outputId) => collectBranch(outputId))]
    }

    const branches = branchEntries.map((entry) => collectBranch(entry))

    branches.forEach((branch, bi) => {
      let currentX = 0
      branch.forEach((nodeId, i, a) => {
        const node = directionalAdjacencyMap.get(nodeId)
        if (node) {
          const constructedNode = constructLayoutNode(nodeId, node.kind, { x: currentX, y: 0 + bi * MARGIN })
          console.log(constructedNode)
          currentX += constructedNode.size.width + MARGIN
          console.log(currentX)

          layoutNodes.set(nodeId, constructedNode)
        }
      })
    })

    console.log(branches)
  }

  console.log(directionalAdjacencyMap)
  console.log(branchEntries)
  return layoutNodes
}

function buildSFDLayout(ir: IR): LayoutResult {
  const nodes = new Map<string, LayoutNode>()

  const sfNodes = buildStockSkeleton(ir.stocks, ir.flows)
  sfNodes.forEach((n) => nodes.set(n.id, n))

  return { nodes: [...nodes.values()], edges: [] }
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
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const allNodes = [...ir.auxiliaries, ...ir.stocks];
  const n = allNodes.length;
  const radius = Math.max(120, n * 35);
  const cx = radius + MARGIN + NODE_SIZE.aux.width / 2;
  const cy = radius + MARGIN + NODE_SIZE.aux.height / 2;

  allNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const isStock = ir.stocks.some((s) => s.id === node.id);
    const kind: NodeKind = isStock ? "stock" : "aux";
    const algorithmX = cx + radius * Math.cos(angle) - NODE_SIZE[kind].width / 2;
    const algorithmY = cy + radius * Math.sin(angle) - NODE_SIZE[kind].height / 2;
    nodes.push(
      getLayoutNode(node.id, kind, node.position?.x ?? algorithmX, node.position?.y ?? algorithmY),
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
