export { compileAST } from "./compile.js";
export { resetLookupCounter } from "./expr.js";
export type {
	IR,
	IRTime,
	IRStock,
	IRAuxiliary,
	IRFlow,
	IRConnection,
	IRExpressionNode,
	IRBinaryOperator,
	IRDiagnostic,
	CompileResult,
	IRGraphicalFunction,
	IRGraphicalFunctionKind,
	IRPosition,
} from "./types.js";
export type { Span } from "@sysdml/parser";
export { DiagnosticCode } from "./diagnostics.js";
export type { DiagnosticCode as DiagnosticCodeType } from "./diagnostics.js";
export {
	BUILTIN_FUNCTIONS,
	BUILTIN_ARITY,
	ZERO_ARG_BUILTINS,
} from "./builtins.js";
