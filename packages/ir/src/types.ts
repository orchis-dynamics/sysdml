import type { Span } from "@sysdml/parser";

import type { DiagnosticCode } from "./diagnostics.js";

// IR expression nodes — no spans, no parse artifacts.
// GroupedExpression is collapsed; tree structure already encodes precedence.
// Comparison and logical ops return 1.0 (true) or 0.0 (false) at simulation time.
export type IRBinaryOperator =
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

export type IRExpressionNode =
	| { type: "Number"; value: number }
	| { type: "Reference"; id: string }
	| {
			type: "BinaryOperation";
			op: IRBinaryOperator;
			left: IRExpressionNode;
			right: IRExpressionNode;
	  }
	| { type: "UnaryMinus"; operand: IRExpressionNode }
	| { type: "Not"; operand: IRExpressionNode }
	| {
			type: "IfThenElse";
			cond: IRExpressionNode;
			thenBranch: IRExpressionNode;
			elseBranch: IRExpressionNode;
	  }
	| { type: "FunctionCall"; name: string; args: IRExpressionNode[] }
	| { type: "GraphicalFunctionCall"; name: string; argument: IRExpressionNode };

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
	model: { id: string };
	time: IRTime;
	stocks: IRStock[];
	auxiliaries: IRAuxiliary[];
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
