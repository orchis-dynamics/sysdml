import type { ElementPositionEdit, IR } from "@sysdml/contracts";

import { computeLayout, isCausalLoopDiagram } from "./layout-engine.js";

export function computeMissingPositions(ir: IR): ElementPositionEdit[] {
	const explicit = new Set<string>();
	const participating = new Set<string>();

	if (isCausalLoopDiagram(ir)) {
		ir.auxiliaries.forEach((auxiliary) => {
			participating.add(auxiliary.id);
			if (auxiliary.position) explicit.add(auxiliary.id);
		});
		ir.connections.forEach((connection) => {
			participating.add(connection.from);
			participating.add(connection.to);
		});
		ir.stocks.forEach((stock) => explicit.add(stock.id));
		ir.flows.forEach((flow) => explicit.add(flow.id));
		ir.graphicalFunctions.forEach((graphicalFunction) =>
			explicit.add(graphicalFunction.id),
		);
	} else {
		ir.stocks.forEach((stock) => {
			participating.add(stock.id);
			if (stock.position) explicit.add(stock.id);
		});
		ir.auxiliaries.forEach((auxiliary) => {
			participating.add(auxiliary.id);
			if (auxiliary.position) explicit.add(auxiliary.id);
		});
	}

	const missingIds = [...participating].filter((id) => !explicit.has(id));
	if (missingIds.length === 0) return [];

	const layoutNodes = new Map(
		computeLayout(ir).nodes.map((node) => [node.id, node]),
	);

	return missingIds.flatMap((id) => {
		const node = layoutNodes.get(id);
		if (!node) return [];
		return [
			{
				id,
				position: {
					x: Math.round(node.position.x),
					y: Math.round(node.position.y),
				},
			},
		];
	});
}
