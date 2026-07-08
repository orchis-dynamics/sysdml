interface SpanCoordinates {
	line: number;
	col: number;
}
export interface Span {
	start: SpanCoordinates;
	end: SpanCoordinates;
}

export interface Diagnostic {
	message: string;
	span: Span;
}

// ── Expression nodes ────────────────────────────────────────────────────────

export interface NumberLiteralNode {
	type: "NumberLiteral";
	value: string;
	span: Span;
}

export interface IdentifierReferenceNode {
	type: "IdentifierReference";
	name: string;
	span: Span;
}

export interface GroupedExpressionNode {
	type: "GroupedExpression";
	expr: ExpressionNode;
	span: Span;
}

export type BinaryOperator =
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

export interface BinaryExpressionNode {
	type: "BinaryExpression";
	op: BinaryOperator;
	left: ExpressionNode;
	right: ExpressionNode;
	span: Span;
}

export type UnaryOperator = "-" | "+" | "NOT";

export interface UnaryExpressionNode {
	type: "UnaryExpression";
	op: UnaryOperator;
	operand: ExpressionNode;
	span: Span;
}

export interface FunctionCallNode {
	type: "FunctionCall";
	name: string;
	nameSpan: Span;
	args: ExpressionNode[];
	span: Span;
}

export interface IfThenElseNode {
	type: "IfThenElse";
	cond: ExpressionNode;
	thenBranch: ExpressionNode;
	elseBranch: ExpressionNode;
	span: Span;
}

export type ExpressionNode =
	| NumberLiteralNode
	| IdentifierReferenceNode
	| GroupedExpressionNode
	| BinaryExpressionNode
	| UnaryExpressionNode
	| FunctionCallNode
	| IfThenElseNode;

export interface SignedNumberNode {
	type: "SignedNumber";
	negative: boolean;
	lit: NumberLiteralNode;
	span: Span;
}

export interface PositionNode {
	type: "Position";
	x: number;
	y: number;
	span: Span;
}

export interface NumberListNode {
	type: "NumberList";
	values: SignedNumberNode[];
	span: Span;
}

export type GraphicalFunctionPropertyNode =
	| {
			type: "GraphicalFunctionProperty";
			key: "kind";
			value: string;
			span: Span;
	  }
	| {
			type: "GraphicalFunctionProperty";
			key: "xscale";
			value: NumberListNode;
			span: Span;
	  }
	| {
			type: "GraphicalFunctionProperty";
			key: "xpts";
			value: NumberListNode;
			span: Span;
	  }
	| {
			type: "GraphicalFunctionProperty";
			key: "ypts";
			value: NumberListNode;
			span: Span;
	  }
	| {
			type: "GraphicalFunctionProperty";
			key: "yscale";
			value: NumberListNode;
			span: Span;
	  };

export interface GraphicalFunctionBodyNode {
	type: "GraphicalFunctionBody";
	props: GraphicalFunctionPropertyNode[];
	span: Span;
}

export interface GraphicalFunctionDeclarationNode {
	type: "GraphicalFunctionDeclaration";
	id: string;
	idSpan: Span;
	body: GraphicalFunctionBodyNode;
	span: Span;
}

// ── Declaration nodes ───────────────────────────────────────────────────────

export interface ModelDeclarationNode {
	type: "ModelDeclaration";
	id: string;
	idSpan: Span;
	kind: "cld" | "sfd";
	span: Span;
}

export interface TimePropertyNode {
	type: "TimeProperty";
	key: "start" | "end" | "step" | "save_step";
	value: NumberLiteralNode;
	span: Span;
}

export interface TimeUnitsNode {
	type: "TimeUnits";
	value: string;
	span: Span;
}

export interface TimeMethodNode {
	type: "TimeMethod";
	value: string;
	span: Span;
}

export interface TimeDeclarationNode {
	type: "TimeDeclaration";
	props: TimePropertyNode[];
	method?: TimeMethodNode;
	timeUnits?: TimeUnitsNode;
	span: Span;
}

export interface StockPropertyNode {
	type: "StockProperty";
	init: ExpressionNode;
	span: Span;
}

export interface StockDeclarationNode {
	type: "StockDeclaration";
	id: string;
	idSpan: Span;
	props: StockPropertyNode[];
	position?: PositionNode;
	span: Span;
}

export interface EndpointNode {
	type: "Endpoint";
	value: string | null;
	span: Span;
}

// FlowPropertyNode is a discriminated union on `key` so that `value`'s type
// narrows correctly when you branch on `prop.key`.
export type FlowPropertyNode =
	| {
			type: "FlowProperty";
			key: "from" | "to";
			value: EndpointNode;
			span: Span;
	  }
	| { type: "FlowProperty"; key: "rate"; value: ExpressionNode; span: Span };

export interface FlowDeclarationNode {
	type: "FlowDeclaration";
	id: string;
	idSpan: Span;
	props: FlowPropertyNode[];
	position?: PositionNode;
	via?: PositionNode[];
	span: Span;
}

export interface AuxiliaryDeclarationNode {
	type: "AuxiliaryDeclaration";
	id: string;
	idSpan: Span;
	expr?: ExpressionNode;
	position?: PositionNode;
	span: Span;
}

export interface ConnectionDeclarationNode {
	type: "ConnectionDeclaration";
	from: string;
	fromSpan: Span;
	polarity: "+" | "-" | "=>";
	to: string;
	toSpan: Span;
	angle?: number;
	angleSpan?: Span;
	via?: PositionNode;
	viaSpan?: Span;
	span: Span;
}

export type DeclarationNode =
	| TimeDeclarationNode
	| StockDeclarationNode
	| FlowDeclarationNode
	| AuxiliaryDeclarationNode
	| ConnectionDeclarationNode
	| GraphicalFunctionDeclarationNode;

export interface FileNode {
	type: "File";
	/** The entry / first declared model. Always present. */
	model: ModelDeclarationNode;
	/** Submodel declarations beyond the entry (XMILE §4.7: separate `model`
	 * blocks at the file level, instantiated by the entry model via a future
	 * `module` construct). Always empty in v0.1 source files; the IR compile
	 * pass emits a `MULTI_MODEL_NOT_SUPPORTED` diagnostic for each element
	 * here until submodel instantiation lands. */
	submodels: ModelDeclarationNode[];
	decls: DeclarationNode[];
	span: Span;
}

export interface ParseResult {
	ast: FileNode | null;
	diagnostics: Diagnostic[];
}

// ── Reserved keyword vocabulary (single source of truth for SYSDML.g4) ───────

export const MODEL_DECLARATION_KEYWORDS = ["sfd", "cld"] as const;

export const BLOCK_DECLARATION_KEYWORDS = [
	"stock",
	"aux",
	"flow",
	"time",
	"gf",
] as const;

export const TOP_LEVEL_KEYWORDS = [
	...MODEL_DECLARATION_KEYWORDS,
	...BLOCK_DECLARATION_KEYWORDS,
] as const;

export type BlockKeywordKind =
	| "stock"
	| "flow"
	| "aux"
	| "time"
	| "gf"
	| "connection";

export const BLOCK_PROPERTY_KEYWORDS: Record<
	BlockKeywordKind,
	readonly string[]
> = {
	stock: ["init", "position"],
	flow: ["from", "to", "rate", "position", "via"],
	aux: ["position"],
	time: ["start", "end", "step", "save_step", "time_units", "method"],
	gf: ["kind", "xscale", "xpts", "ypts", "yscale"],
	connection: ["angle", "via"],
};

export const LOGICAL_OPERATOR_KEYWORDS = [
	"IF",
	"THEN",
	"ELSE",
	"AND",
	"OR",
	"NOT",
	"MOD",
] as const;

export const CONSTANT_KEYWORDS = ["null"] as const;

export const PROPERTY_KEYWORDS: readonly string[] = [
	...new Set(Object.values(BLOCK_PROPERTY_KEYWORDS).flat()),
];

export const ALL_KEYWORDS: readonly string[] = [
	...TOP_LEVEL_KEYWORDS,
	...PROPERTY_KEYWORDS,
	...LOGICAL_OPERATOR_KEYWORDS,
	...CONSTANT_KEYWORDS,
];
