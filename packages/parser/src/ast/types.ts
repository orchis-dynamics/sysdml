export interface Span {
	start: { line: number; col: number };
	end: { line: number; col: number };
}

export interface Diagnostic {
	message: string;
	span: Span;
}

// ── Expression nodes ────────────────────────────────────────────────────────

export interface NumberLitNode {
	type: "NumberLit";
	value: string;
	span: Span;
}

export interface IdentRefNode {
	type: "IdentRef";
	name: string;
	span: Span;
}

export interface GroupedExprNode {
	type: "GroupedExpr";
	expr: ExprNode;
	span: Span;
}

export type BinaryOp =
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

export interface BinaryExprNode {
	type: "BinaryExpr";
	op: BinaryOp;
	left: ExprNode;
	right: ExprNode;
	span: Span;
}

export type UnaryOp = "-" | "+" | "NOT";

export interface UnaryExprNode {
	type: "UnaryExpr";
	op: UnaryOp;
	operand: ExprNode;
	span: Span;
}

export interface FunctionCallNode {
	type: "FunctionCall";
	name: string;
	nameSpan: Span;
	args: ExprNode[];
	span: Span;
}

export interface IfThenElseNode {
	type: "IfThenElse";
	cond: ExprNode;
	thenBranch: ExprNode;
	elseBranch: ExprNode;
	span: Span;
}

export type ExprNode =
	| NumberLitNode
	| IdentRefNode
	| GroupedExprNode
	| BinaryExprNode
	| UnaryExprNode
	| FunctionCallNode
	| IfThenElseNode;

export interface SignedNumberNode {
	type: "SignedNumber";
	negative: boolean;
	lit: NumberLitNode;
	span: Span;
}

export interface PosNode {
	type: "Pos";
	x: number;
	y: number;
	span: Span;
}

export interface NumListNode {
	type: "NumList";
	values: SignedNumberNode[];
	span: Span;
}

export type GfKind = "linear" | "extra" | "step";

export type GfPropNode =
	| { type: "GfProp"; key: "kind"; value: string; span: Span }
	| { type: "GfProp"; key: "xscale"; value: NumListNode; span: Span }
	| { type: "GfProp"; key: "xpts"; value: NumListNode; span: Span }
	| { type: "GfProp"; key: "ypts"; value: NumListNode; span: Span }
	| { type: "GfProp"; key: "yscale"; value: NumListNode; span: Span };

export interface GfBodyNode {
	type: "GfBody";
	props: GfPropNode[];
	span: Span;
}

export interface GfDeclNode {
	type: "GfDecl";
	id: string;
	idSpan: Span;
	body: GfBodyNode;
	span: Span;
}

// ── Declaration nodes ───────────────────────────────────────────────────────

export interface ModelDeclNode {
	type: "ModelDecl";
	id: string;
	idSpan: Span;
	span: Span;
}

export interface TimePropNode {
	type: "TimeProp";
	key: "start" | "end" | "step";
	value: NumberLitNode;
	span: Span;
}

export interface TimeDeclNode {
	type: "TimeDecl";
	props: TimePropNode[];
	span: Span;
}

export interface StockPropNode {
	type: "StockProp";
	init: ExprNode;
	span: Span;
}

export interface StockDeclNode {
	type: "StockDecl";
	id: string;
	idSpan: Span;
	props: StockPropNode[];
	position?: PosNode;
	span: Span;
}

export interface EndpointNode {
	type: "Endpoint";
	value: string | null;
	span: Span;
}

// FlowPropNode is a discriminated union on `key` so that `value`'s type
// narrows correctly when you branch on `prop.key`.
export type FlowPropNode =
	| { type: "FlowProp"; key: "from" | "to"; value: EndpointNode; span: Span }
	| { type: "FlowProp"; key: "rate"; value: ExprNode; span: Span };

export interface FlowDeclNode {
	type: "FlowDecl";
	id: string;
	idSpan: Span;
	props: FlowPropNode[];
	position?: PosNode;
	via?: PosNode[];
	span: Span;
}

export interface AuxDeclNode {
	type: "AuxDecl";
	id: string;
	idSpan: Span;
	expr: ExprNode;
	position?: PosNode;
	span: Span;
}

export interface ConnectionDeclNode {
	type: "ConnectionDecl";
	from: string;
	fromSpan: Span;
	polarity: "+" | "-" | "=>";
	to: string;
	toSpan: Span;
	angle?: number;
	via?: PosNode;
	span: Span;
}

export type DeclNode =
	| TimeDeclNode
	| StockDeclNode
	| FlowDeclNode
	| AuxDeclNode
	| ConnectionDeclNode
	| GfDeclNode;

export interface FileNode {
	type: "File";
	model: ModelDeclNode;
	decls: DeclNode[];
	span: Span;
}

export type ASTNode =
	| FileNode
	| ModelDeclNode
	| DeclNode
	| ExprNode
	| TimePropNode
	| FlowPropNode
	| StockPropNode
	| EndpointNode
	| GfBodyNode
	| GfPropNode
	| NumListNode
	| SignedNumberNode
	| PosNode;
