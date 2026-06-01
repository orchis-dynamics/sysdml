import type { IRConnection, IRFlow } from "@sysdml/ir";

import { LayoutEdge } from "./layout-types.js";

export function constructLayoutEdges(
	flows: IRFlow[],
	connections: IRConnection[],
): Map<string, LayoutEdge> {
	const edges = new Map<string, LayoutEdge>();

	flows.forEach((flow) => {
		const source = flow.from ?? flow.id;
		const target = flow.to ?? flow.id;
		const id = `flow-${flow.id}`;
		edges.set(id, { id, kind: "flow", source, target, points: [] });
	});

	connections.forEach((connection) => {
		const id = `conn-${connection.from}-${connection.to}`;
		edges.set(id, {
			id,
			kind: "connection",
			source: connection.from,
			target: connection.to,
			polarity: connection.polarity,
			points: [],
		});
	});

	return edges;
}
