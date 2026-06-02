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
} from "@sysdml/ir";

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

function serializeExpression(node: IRExpressionNode): string {
	switch (node.type) {
		case "Number":
			return String(node.value);
		case "Reference":
			return node.id;
		case "UnaryMinus":
			return `-(${serializeExpression(node.operand)})`;
		case "Not":
			return `NOT (${serializeExpression(node.operand)})`;
		case "BinaryOperation":
			return `(${serializeExpression(node.left)} ${serializeBinaryOperator(node.op)} ${serializeExpression(node.right)})`;
		case "IfThenElse":
			return `IF (${serializeExpression(node.cond)}) THEN (${serializeExpression(node.thenBranch)}) ELSE (${serializeExpression(node.elseBranch)})`;
		case "FunctionCall":
			return `${node.name}(${node.args.map(serializeExpression).join(", ")})`;
		case "GraphicalFunctionCall":
			return serializeExpression(node.argument);
	}
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

function findGraphicalFunction(
	expression: IRExpressionNode,
	graphicalFunctions: IRGraphicalFunction[],
): SimlinGraphicalFunction | undefined {
	if (expression.type !== "GraphicalFunctionCall") {
		return undefined;
	}
	const definition = graphicalFunctions.find(
		(candidate) => candidate.id === expression.name,
	);
	return definition ? convertGraphicalFunction(definition) : undefined;
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

function mapStocks(ir: IR): SimlinStock[] {
	const wiringByStockId = buildStockFlowWiring(ir.flows);
	return ir.stocks.map((stock) => {
		const wiring = wiringByStockId.get(stock.id);
		return {
			name: stock.id,
			initialEquation: serializeExpression(stock.init),
			inflows: wiring ? wiring.inflows : [],
			outflows: wiring ? wiring.outflows : [],
		};
	});
}

function mapFlows(ir: IR): SimlinFlow[] {
	return ir.flows.map((flow) => {
		const graphicalFunction = findGraphicalFunction(
			flow.rate,
			ir.graphicalFunctions,
		);
		const equation = serializeExpression(flow.rate);
		return graphicalFunction
			? { name: flow.id, equation, graphicalFunction }
			: { name: flow.id, equation };
	});
}

function mapAuxiliaries(ir: IR): SimlinAuxiliary[] {
	return ir.auxiliaries.map((auxiliary) => {
		const graphicalFunction = findGraphicalFunction(
			auxiliary.expr,
			ir.graphicalFunctions,
		);
		const equation = serializeExpression(auxiliary.expr);
		return graphicalFunction
			? { name: auxiliary.id, equation, graphicalFunction }
			: { name: auxiliary.id, equation };
	});
}

export function irToSimlinProject(ir: IR): SimlinProject {
	return {
		name: ir.model.id,
		simSpecs: {
			startTime: ir.time.start,
			endTime: ir.time.end,
			dt: String(ir.time.step),
			method: "euler",
		},
		models: [
			{
				name: "main",
				stocks: mapStocks(ir),
				flows: mapFlows(ir),
				auxiliaries: mapAuxiliaries(ir),
			},
		],
	};
}
