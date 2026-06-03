import type { ExpressionNode } from "@sysdml/contracts";

import {
	BUILTIN_ARITY,
	BUILTIN_FUNCTIONS,
	ZERO_ARG_BUILTINS,
} from "@sysdml/contracts";
import { DiagnosticCode } from "@sysdml/contracts";
import type {
	IRDiagnostic,
	IRExpressionNode,
	IRGraphicalFunction,
} from "@sysdml/contracts";

let _lookupCounter = 0;

export function resetLookupCounter(): void {
	_lookupCounter = 0;
}

export function compileExpr(
	node: ExpressionNode,
	validIds: ReadonlySet<string>,
	graphicalFunctionNames: ReadonlySet<string>,
	errors: IRDiagnostic[],
	syntheticGraphicalFunctions: IRGraphicalFunction[],
): IRExpressionNode {
	switch (node.type) {
		case "NumberLiteral":
			return { type: "Number", value: parseFloat(node.value) };

		case "IdentifierReference": {
			const uppercasedName = node.name.toUpperCase();
			if (ZERO_ARG_BUILTINS.has(uppercasedName)) {
				return { type: "FunctionCall", name: uppercasedName, args: [] };
			}
			if (!validIds.has(node.name)) {
				errors.push({
					code: DiagnosticCode.UNDEFINED_IDENTIFIER,
					message: `Undefined identifier '${node.name}'`,
					span: node.span,
				});
			}
			return { type: "Reference", id: node.name };
		}

		case "GroupedExpression":
			return compileExpr(
				node.expr,
				validIds,
				graphicalFunctionNames,
				errors,
				syntheticGraphicalFunctions,
			);

		case "UnaryExpression": {
			const operand = compileExpr(
				node.operand,
				validIds,
				graphicalFunctionNames,
				errors,
				syntheticGraphicalFunctions,
			);
			return node.op === "NOT"
				? { type: "Not", operand }
				: { type: "UnaryMinus", operand };
		}

		case "BinaryExpression":
			return {
				type: "BinaryOperation",
				op: node.op,
				left: compileExpr(
					node.left,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				),
				right: compileExpr(
					node.right,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				),
			};

		case "IfThenElse":
			return {
				type: "IfThenElse",
				cond: compileExpr(
					node.cond,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				),
				thenBranch: compileExpr(
					node.thenBranch,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				),
				elseBranch: compileExpr(
					node.elseBranch,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				),
			};

		case "FunctionCall": {
			const uppercasedName = node.name.toUpperCase();

			if (graphicalFunctionNames.has(node.name)) {
				return compileGfCall(
					node.name,
					node.args,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				);
			}

			if (uppercasedName === "LOOKUP") {
				return compileLookup(
					node.args,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				);
			}

			const isBuiltin = BUILTIN_FUNCTIONS.has(uppercasedName);
			const resolvedName = isBuiltin ? uppercasedName : node.name;

			if (!isBuiltin) {
				errors.push({
					code: DiagnosticCode.UNKNOWN_FUNCTION,
					message: `Unknown function '${node.name}'`,
					span: node.nameSpan,
				});
			} else {
				const { min, max } = BUILTIN_ARITY[uppercasedName];
				const actualArgCount = node.args.length;
				if (actualArgCount < min || actualArgCount > max) {
					const expectedArity = min === max ? `${min}` : `${min}–${max}`;
					errors.push({
						code: DiagnosticCode.WRONG_ARITY,
						message: `'${uppercasedName}' expects ${expectedArity} argument(s), got ${actualArgCount}`,
						span: node.nameSpan,
					});
				}
			}

			const args = node.args.map((argument) =>
				compileExpr(
					argument,
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				),
			);

			if (isBuiltin && uppercasedName === "IF_THEN_ELSE" && args.length === 3) {
				return {
					type: "IfThenElse",
					cond: args[0],
					thenBranch: args[1],
					elseBranch: args[2],
				};
			}

			return { type: "FunctionCall", name: resolvedName, args };
		}
	}
}

function compileGfCall(
	name: string,
	args: readonly ExpressionNode[],
	validIds: ReadonlySet<string>,
	graphicalFunctionNames: ReadonlySet<string>,
	errors: IRDiagnostic[],
	syntheticGraphicalFunctions: IRGraphicalFunction[],
): IRExpressionNode {
	if (args.length !== 1) {
		errors.push({
			code: DiagnosticCode.GF_WRONG_ARITY,
			message: `Graphical function '${name}' expects 1 argument, got ${args.length}`,
		});
	}
	const compiledArgument =
		args.length > 0
			? compileExpr(
					args[0],
					validIds,
					graphicalFunctionNames,
					errors,
					syntheticGraphicalFunctions,
				)
			: ({ type: "Number", value: 0 } as IRExpressionNode);
	return { type: "GraphicalFunctionCall", name, argument: compiledArgument };
}

function compileLookup(
	args: readonly ExpressionNode[],
	validIds: ReadonlySet<string>,
	graphicalFunctionNames: ReadonlySet<string>,
	errors: IRDiagnostic[],
	syntheticGraphicalFunctions: IRGraphicalFunction[],
): IRExpressionNode {
	const yPointCount = args.length - 1;
	if (args.length < 3) {
		errors.push({
			code: DiagnosticCode.LOOKUP_TOO_FEW_YPTS,
			message: `lookup() requires at least 2 y-points (got ${yPointCount < 0 ? 0 : yPointCount})`,
		});
		return { type: "Number", value: 0 };
	}

	const ypts: number[] = [];
	for (const yArgument of args.slice(1)) {
		const literalValue = extractLiteralNumber(yArgument);
		if (literalValue === null) {
			errors.push({
				code: DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
				message: "lookup() y-values must be numeric literals",
			});
			return { type: "Number", value: 0 };
		}
		ypts.push(literalValue);
	}

	const id = `__lookup_${_lookupCounter++}`;
	syntheticGraphicalFunctions.push({
		id,
		kind: "linear",
		xscale: [0, 1],
		xpts: null,
		ypts,
		yscale: null,
	});

	const compiledInput = compileExpr(
		args[0],
		validIds,
		graphicalFunctionNames,
		errors,
		syntheticGraphicalFunctions,
	);
	return { type: "GraphicalFunctionCall", name: id, argument: compiledInput };
}

function extractLiteralNumber(node: ExpressionNode): number | null {
	if (node.type === "NumberLiteral") {
		return parseFloat(node.value);
	}
	if (
		node.type === "UnaryExpression" &&
		node.op === "-" &&
		node.operand.type === "NumberLiteral"
	) {
		return -parseFloat(node.operand.value);
	}
	return null;
}
