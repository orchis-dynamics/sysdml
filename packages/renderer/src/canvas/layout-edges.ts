import type { IRConnection, IRFlow } from "@sysdml/contracts";

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
		edges.set(id, { id, kind: "flow", source, target, via: flow.via });
	});

	const occurrenceByTriple = new Map<string, number>();
	connections.forEach((connection) => {
		const tripleKey = `${connection.from}|${connection.polarity}|${connection.to}`;
		const occurrence = occurrenceByTriple.get(tripleKey) ?? 0;
		occurrenceByTriple.set(tripleKey, occurrence + 1);
		const id = `conn-${connection.from}-${connection.polarity}-${connection.to}-${occurrence}`;
		edges.set(id, {
			id,
			kind: "connection",
			source: connection.from,
			target: connection.to,
			polarity: connection.polarity,
			occurrence,
			angle: connection.angle,
			via: connection.via,
		});
	});

	return edges;
}
