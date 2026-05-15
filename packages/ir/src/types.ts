import type { Span } from "@sysdml/parser";
import type { DiagnosticCode } from "./diagnostics.js";

// IR expression nodes — no spans, no parse artifacts.
// GroupedExpr is collapsed; tree structure already encodes precedence.
// Comparison and logical ops return 1.0 (true) or 0.0 (false) at simulation time.
export type IRBinOp =
	| "+"
	| "-"
	| "*"
	| "/"
	| "^"
	| "MOD"
	| "<"
	| "<="
	| ">"
	| ">="
	| "="
	| "<>"
	| "AND"
	| "OR";

export type IRExprNode =
	| { type: "Num"; value: number }
	| { type: "Ref"; id: string }
	| { type: "BinOp"; op: IRBinOp; left: IRExprNode; right: IRExprNode }
	| { type: "UnaryMinus"; operand: IRExprNode }
	| { type: "Not"; operand: IRExprNode }
	| {
			type: "IfThenElse";
			cond: IRExprNode;
			thenBranch: IRExprNode;
			elseBranch: IRExprNode;
	  }
	| { type: "FunctionCall"; name: string; args: IRExprNode[] }
	| { type: "GFCall"; name: string; argument: IRExprNode };

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
	init: IRExprNode;
	position?: IRPosition;
}

export interface IRAux {
	id: string;
	expr: IRExprNode;
	position?: IRPosition;
}

export interface IRFlow {
	id: string;
	from: string | null;
	to: string | null;
	rate: IRExprNode;
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

export type IRGfKind = "linear" | "extra" | "step";

// Exactly one of xscale or xpts is set (never both, never neither).
export interface IRGraphicalFunction {
	id: string;
	kind: IRGfKind;
	xscale: [number, number] | null;
	xpts: number[] | null;
	ypts: number[];
	yscale: [number, number] | null;
}

export interface IR {
	ir_version: "0.1";
	model: { id: string };
	time: IRTime;
	stocks: IRStock[];
	aux: IRAux[];
	flows: IRFlow[];
	connections: IRConnection[];
	graphicalFunctions: IRGraphicalFunction[];
}

export interface IRDiagnostic {
	code: DiagnosticCode;
	message: string;
	span?: Span;
}

export interface CompileResult {
	ir: IR | null;
	diagnostics: IRDiagnostic[];
}
