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

export const BUILTIN_ARITY: Record<string, { min: number; max: number }> = {
	// Math — 1 arg
	ABS: { min: 1, max: 1 },
	INT: { min: 1, max: 1 },
	SQRT: { min: 1, max: 1 },
	EXP: { min: 1, max: 1 },
	LN: { min: 1, max: 1 },
	LOG10: { min: 1, max: 1 },
	SIN: { min: 1, max: 1 },
	COS: { min: 1, max: 1 },
	TAN: { min: 1, max: 1 },
	ARCSIN: { min: 1, max: 1 },
	ARCCOS: { min: 1, max: 1 },
	ARCTAN: { min: 1, max: 1 },
	// Math — 2 args
	MIN: { min: 2, max: 2 },
	MAX: { min: 2, max: 2 },
	SIGN: { min: 1, max: 1 },
	SAFEDIV: { min: 3, max: 3 },
	// Zero-arg
	TIME: { min: 0, max: 0 },
	DT: { min: 0, max: 0 },
	STARTTIME: { min: 0, max: 0 },
	STOPTIME: { min: 0, max: 0 },
	PI: { min: 0, max: 0 },
	INF: { min: 0, max: 0 },
	// Misc / memory
	INIT: { min: 1, max: 1 },
	PREVIOUS: { min: 2, max: 2 },
	SELF: { min: 0, max: 0 },
	// Delay and smoothing — optional init arg
	DELAY1: { min: 2, max: 3 },
	DELAY3: { min: 2, max: 3 },
	DELAYN: { min: 3, max: 4 },
	DELAY: { min: 2, max: 3 },
	SMTH1: { min: 2, max: 3 },
	SMTH3: { min: 2, max: 3 },
	SMTHN: { min: 3, max: 4 },
	TREND: { min: 2, max: 3 },
	FORCST: { min: 3, max: 4 },
	// Test inputs
	STEP: { min: 2, max: 2 },
	RAMP: { min: 2, max: 2 },
	PULSE: { min: 2, max: 3 },
	// Statistical — optional seed
	RANDOM: { min: 2, max: 3 },
	NORMAL: { min: 2, max: 3 },
	LOGNORMAL: { min: 2, max: 3 },
	EXPRND: { min: 1, max: 2 },
	POISSON: { min: 1, max: 2 },
	// Conditional — IF_THEN_ELSE(cond, then, else); compiler lowers it to IfThenElse IR node
	IF_THEN_ELSE: { min: 3, max: 3 },
	// lookup(input, y0, y1, ...) — inline graphical function; min 3 = input + 2 y-points.
	// Compiler lowers it to a GFCall with a synthetic IRGraphicalFunction.
	LOOKUP: { min: 3, max: 1001 },
};

export const BUILTIN_FUNCTIONS = new Set(Object.keys(BUILTIN_ARITY));

export const ZERO_ARG_BUILTINS = new Set([
	"TIME",
	"DT",
	"STARTTIME",
	"STOPTIME",
	"PI",
	"INF",
]);
