import type { IR, IRExpressionNode, SimDiagnostic } from "@sysdml/contracts";

const STOCHASTIC_BUILTINS = [
	"RANDOM",
	"NORMAL",
	"LOGNORMAL",
	"EXPRND",
	"POISSON",
];

function stochasticReason(name: string): string {
	return `${name} is a stochastic function, which the deterministic simulation engine does not support`;
}

const UNSUPPORTED_ENGINE_BUILTINS = new Map<string, string>([
	["FORCST", "FORCST is not supported by the simulation engine"],
	...STOCHASTIC_BUILTINS.map((name): [string, string] => [
		name,
		stochasticReason(name),
	]),
]);

function childExpressions(node: IRExpressionNode): IRExpressionNode[] {
	switch (node.type) {
		case "Number":
		case "Reference":
			return [];
		case "UnaryMinus":
		case "Not":
			return [node.operand];
		case "BinaryOperation":
			return [node.left, node.right];
		case "IfThenElse":
			return [node.cond, node.thenBranch, node.elseBranch];
		case "FunctionCall":
			return node.args;
		case "GraphicalFunctionCall":
			return [node.argument];
	}
}

function collectFunctionCallNames(
	node: IRExpressionNode,
	names: Set<string>,
): void {
	if (node.type === "FunctionCall") {
		names.add(node.name);
	}
	for (const child of childExpressions(node)) {
		collectFunctionCallNames(child, names);
	}
}

function collectModelFunctionCallNames(ir: IR): Set<string> {
	const names = new Set<string>();
	for (const stock of ir.stocks) collectFunctionCallNames(stock.init, names);
	for (const auxiliary of ir.auxiliaries)
		collectFunctionCallNames(auxiliary.expr, names);
	for (const flow of ir.flows) collectFunctionCallNames(flow.rate, names);
	return names;
}

export function collectUnsupportedBuiltinDiagnostics(ir: IR): SimDiagnostic[] {
	const usedNames = collectModelFunctionCallNames(ir);
	const diagnostics: SimDiagnostic[] = [];
	for (const [name, reason] of UNSUPPORTED_ENGINE_BUILTINS) {
		if (usedNames.has(name)) {
			diagnostics.push({ code: "error", message: reason });
		}
	}
	return diagnostics;
}
