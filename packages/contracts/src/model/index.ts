import type { IRExpressionNode } from "../expression/index.js";
import type { IRDiagnostic } from "../diagnostics/index.js";

export interface IRTime {
	start: number;
	end: number;
	step: number;
}

export interface IRPosition {
	x: number;
	y: number;
}

export interface IRStock {
	id: string;
	init: IRExpressionNode;
	position?: IRPosition;
}

export interface IRAuxiliary {
	id: string;
	expr: IRExpressionNode;
	position?: IRPosition;
}

export interface IRFlow {
	id: string;
	from: string | null;
	to: string | null;
	rate: IRExpressionNode;
	position?: IRPosition;
	via?: IRPosition[];
}

export interface IRConnection {
	from: string;
	polarity: "+" | "-" | "=>";
	to: string;
	angle?: number;
	via?: IRPosition;
}

export type IRGraphicalFunctionKind = "linear" | "extra" | "step";

// Exactly one of xscale or xpts is set (never both, never neither).
export interface IRGraphicalFunction {
	id: string;
	kind: IRGraphicalFunctionKind;
	xscale: [number, number] | null;
	xpts: number[] | null;
	ypts: number[];
	yscale: [number, number] | null;
}

export interface IR {
	ir_version: "0.1";
	model: { id: string; kind: "cld" | "sfd" };
	time: IRTime;
	stocks: IRStock[];
	auxiliaries: IRAuxiliary[];
	flows: IRFlow[];
	connections: IRConnection[];
	graphicalFunctions: IRGraphicalFunction[];
}

export interface CompileResult {
	ir: IR | null;
	diagnostics: IRDiagnostic[];
}
