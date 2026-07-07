import type {
	JsonAuxiliary as SimlinAuxiliary,
	JsonFlow as SimlinFlow,
	JsonGraphicalFunction as SimlinGraphicalFunction,
	JsonGraphicalFunctionScale as SimlinGraphicalFunctionScale,
	JsonModel as SimlinModel,
	JsonProject as SimlinProject,
	JsonSimSpecs as SimlinSimSpecs,
	JsonStock as SimlinStock,
} from "@simlin/engine";
import type {
	IR,
	IRBinaryOperator,
	IRExpressionNode,
	IRFlow,
	IRGraphicalFunction,
} from "@sysdml/contracts";

export type {
	SimlinAuxiliary,
	SimlinFlow,
	SimlinGraphicalFunction,
	SimlinGraphicalFunctionScale,
	SimlinModel,
	SimlinProject,
	SimlinSimSpecs,
	SimlinStock,
};

const KEYWORD_OPERATORS: Record<string, string> = {
	MOD: "mod",
	AND: "and",
	OR: "or",
};

function serializeBinaryOperator(operator: IRBinaryOperator): string {
	return KEYWORD_OPERATORS[operator] ?? operator;
}

function serializeExpression(
	node: IRExpressionNode,
	context: EquationLoweringContext,
): string {
	const serialize = (child: IRExpressionNode): string =>
		serializeExpression(child, context);
	switch (node.type) {
		case "Number":
			return String(node.value);
		case "Reference":
			return node.id;
		case "UnaryMinus":
			return `-(${serialize(node.operand)})`;
		case "Not":
			return `NOT (${serialize(node.operand)})`;
		case "BinaryOperation":
			return `(${serialize(node.left)} ${serializeBinaryOperator(node.op)} ${serialize(node.right)})`;
		case "IfThenElse":
			return `IF (${serialize(node.cond)}) THEN (${serialize(node.thenBranch)}) ELSE (${serialize(node.elseBranch)})`;
		case "FunctionCall":
			return `${node.name}(${node.args.map(serialize).join(", ")})`;
		case "GraphicalFunctionCall":
			return serializeGraphicalFunctionCall(node, context);
	}
}

function serializeGraphicalFunctionCall(
	node: Extract<IRExpressionNode, { type: "GraphicalFunctionCall" }>,
	context: EquationLoweringContext,
): string {
	const argument = serializeExpression(node.argument, context);
	const definition = findGraphicalFunctionDefinition(
		node.name,
		context.graphicalFunctions,
	);
	if (!definition) {
		throw new Error(
			`graphical function '${node.name}' is referenced but not defined in the IR`,
		);
	}
	const hiddenName = context.allocateHiddenAuxiliaryName();
	context.hiddenAuxiliaries.push({
		name: hiddenName,
		equation: argument,
		graphicalFunction: convertGraphicalFunction(definition),
	});
	return hiddenName;
}

function serializeGraphicalFunctionKind(
	kind: IRGraphicalFunction["kind"],
): string {
	switch (kind) {
		case "extra":
			return "extrapolate";
		case "step":
			return "discrete";
		case "linear":
			return "continuous";
	}
}

function convertGraphicalFunction(
	graphicalFunction: IRGraphicalFunction,
): SimlinGraphicalFunction {
	const result: SimlinGraphicalFunction = {
		kind: serializeGraphicalFunctionKind(graphicalFunction.kind),
	};
	if (graphicalFunction.xpts) {
		result.points = graphicalFunction.xpts.map((x, index) => [
			x,
			graphicalFunction.ypts[index],
		]);
	} else {
		result.yPoints = graphicalFunction.ypts;
		if (graphicalFunction.xscale) {
			result.xScale = {
				min: graphicalFunction.xscale[0],
				max: graphicalFunction.xscale[1],
			};
		}
	}
	return result;
}

function findGraphicalFunctionDefinition(
	name: string,
	graphicalFunctions: IRGraphicalFunction[],
): IRGraphicalFunction | undefined {
	return graphicalFunctions.find((candidate) => candidate.id === name);
}

interface EquationLoweringContext {
	graphicalFunctions: IRGraphicalFunction[];
	allocateHiddenAuxiliaryName: () => string;
	hiddenAuxiliaries: SimlinAuxiliary[];
}

function createHiddenAuxiliaryNameAllocator(ir: IR): () => string {
	const usedNames = new Set<string>();
	for (const stock of ir.stocks) usedNames.add(stock.id);
	for (const auxiliary of ir.auxiliaries) usedNames.add(auxiliary.id);
	for (const flow of ir.flows) usedNames.add(flow.id);
	for (const graphicalFunction of ir.graphicalFunctions)
		usedNames.add(graphicalFunction.id);
	let counter = 0;
	return () => {
		let candidate = `_lookup_${counter}`;
		while (usedNames.has(candidate)) {
			counter += 1;
			candidate = `_lookup_${counter}`;
		}
		usedNames.add(candidate);
		counter += 1;
		return candidate;
	};
}

interface LoweredEquation {
	equation: string;
	graphicalFunction?: SimlinGraphicalFunction;
}

function lowerEquation(
	expression: IRExpressionNode,
	context: EquationLoweringContext,
): LoweredEquation {
	if (expression.type === "GraphicalFunctionCall") {
		const definition = findGraphicalFunctionDefinition(
			expression.name,
			context.graphicalFunctions,
		);
		if (definition) {
			return {
				equation: serializeExpression(expression.argument, context),
				graphicalFunction: convertGraphicalFunction(definition),
			};
		}
	}
	return { equation: serializeExpression(expression, context) };
}

interface StockFlowWiring {
	inflows: string[];
	outflows: string[];
}

function buildStockFlowWiring(flows: IRFlow[]): Map<string, StockFlowWiring> {
	const wiringByStockId = new Map<string, StockFlowWiring>();
	const wiringFor = (stockId: string): StockFlowWiring => {
		const existing = wiringByStockId.get(stockId);
		if (existing) {
			return existing;
		}
		const created: StockFlowWiring = { inflows: [], outflows: [] };
		wiringByStockId.set(stockId, created);
		return created;
	};
	for (const flow of flows) {
		if (flow.to !== null) {
			wiringFor(flow.to).inflows.push(flow.id);
		}
		if (flow.from !== null) {
			wiringFor(flow.from).outflows.push(flow.id);
		}
	}
	return wiringByStockId;
}

function mapStocks(ir: IR, context: EquationLoweringContext): SimlinStock[] {
	const wiringByStockId = buildStockFlowWiring(ir.flows);
	return ir.stocks.map((stock) => {
		const wiring = wiringByStockId.get(stock.id);
		return {
			name: stock.id,
			initialEquation: serializeExpression(stock.init, context),
			inflows: wiring ? wiring.inflows : [],
			outflows: wiring ? wiring.outflows : [],
		};
	});
}

function mapFlows(ir: IR, context: EquationLoweringContext): SimlinFlow[] {
	return ir.flows.map((flow) => {
		const lowered = lowerEquation(flow.rate, context);
		return lowered.graphicalFunction
			? {
					name: flow.id,
					equation: lowered.equation,
					graphicalFunction: lowered.graphicalFunction,
				}
			: { name: flow.id, equation: lowered.equation };
	});
}

function mapAuxiliaries(
	ir: IR,
	context: EquationLoweringContext,
): SimlinAuxiliary[] {
	return ir.auxiliaries.flatMap((auxiliary) => {
		if (!auxiliary.expr) return [];
		const lowered = lowerEquation(auxiliary.expr, context);
		return [
			lowered.graphicalFunction
				? {
						name: auxiliary.id,
						equation: lowered.equation,
						graphicalFunction: lowered.graphicalFunction,
					}
				: { name: auxiliary.id, equation: lowered.equation },
		];
	});
}

function mapSimSpecs(ir: IR): SimlinSimSpecs {
	return {
		startTime: ir.time.start,
		endTime: ir.time.end,
		dt: String(ir.time.step),
		...(ir.time.saveStep !== undefined && { saveStep: ir.time.saveStep }),
		...(ir.time.timeUnits !== undefined && { timeUnits: ir.time.timeUnits }),
		method: "euler",
	};
}

export function irToSimlinProject(ir: IR): SimlinProject {
	const context: EquationLoweringContext = {
		graphicalFunctions: ir.graphicalFunctions,
		allocateHiddenAuxiliaryName: createHiddenAuxiliaryNameAllocator(ir),
		hiddenAuxiliaries: [],
	};
	const stocks = mapStocks(ir, context);
	const flows = mapFlows(ir, context);
	const auxiliaries = mapAuxiliaries(ir, context);
	return {
		name: ir.model.id,
		simSpecs: mapSimSpecs(ir),
		models: [
			{
				name: "main",
				stocks,
				flows,
				auxiliaries: [...auxiliaries, ...context.hiddenAuxiliaries],
			},
		],
	};
}
