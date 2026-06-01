import { IRPosition } from "@sysdml/ir";

export enum NodeKindEnum {
	Stock = "stock",
	Aux = "aux",
	Flow = "flow",
}
export type NodeKind = `${NodeKindEnum}`;
export type NodeSize = { width: number; height: number };

export interface LayoutInputNode {
	id: string;
	position?: IRPosition;
}

export interface LayoutNode {
	id: string;
	kind: NodeKind;
	position: IRPosition;
	size: NodeSize;
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
