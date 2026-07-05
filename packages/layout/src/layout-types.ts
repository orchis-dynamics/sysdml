import type { IRPosition } from "@sysdml/contracts";

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

export interface LayoutFlowEdge {
	id: string;
	kind: "flow";
	source: string;
	target: string;
	via?: IRPosition[];
}

export interface LayoutConnectionEdge {
	id: string;
	kind: "connection";
	source: string;
	target: string;
	polarity: "+" | "-" | "=>";
	occurrence: number;
	angle?: number;
	via?: IRPosition;
}

export type LayoutEdge = LayoutFlowEdge | LayoutConnectionEdge;

export interface LayoutResult {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
}
