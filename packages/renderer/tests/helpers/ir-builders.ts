import type {
	IR,
	IRAuxiliary,
	IRConnection,
	IRExpressionNode,
	IRFlow,
	IRStock,
} from "@sysdml/contracts";

const ZERO: IRExpressionNode = { type: "Number", value: 0 };

export function stock(
	id: string,
	position?: { x: number; y: number },
): IRStock {
	return { id, init: ZERO, position };
}

export function aux(
	id: string,
	position?: { x: number; y: number },
): IRAuxiliary {
	return { id, expr: ZERO, position };
}

export function flow(
	id: string,
	from: string | null,
	to: string | null,
	position?: { x: number; y: number },
): IRFlow {
	return { id, from, to, rate: ZERO, position };
}

export function connection(
	from: string,
	to: string,
	polarity: "+" | "-" | "=>" = "+",
): IRConnection {
	return { from, to, polarity };
}

export function ir(parts: Partial<IR> = {}): IR {
	return {
		ir_version: "0.1",
		model: { id: "test", kind: "sfd" },
		time: { start: 0, end: 1, step: 1 },
		stocks: [],
		auxiliaries: [],
		flows: [],
		connections: [],
		graphicalFunctions: [],
		...parts,
	};
}
