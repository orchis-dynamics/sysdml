import type {
	FileNode,
	DeclarationNode,
	ExpressionNode,
	TimeDeclarationNode,
	StockDeclarationNode,
	AuxiliaryDeclarationNode,
	FlowDeclarationNode,
	FlowPropertyNode,
	ConnectionDeclarationNode,
	GraphicalFunctionDeclarationNode,
	GraphicalFunctionBodyNode,
	NumberListNode,
	PositionNode,
} from "@sysdml/contracts";
import { parseSource } from "@sysdml/parser";

export function formatSource(source: string): string | null {
	if (containsComments(source)) return null;
	const { ast, diagnostics } = parseSource(source);
	if (!ast || diagnostics.length > 0) return null;
	return printFile(ast);
}

function containsComments(source: string): boolean {
	return source.includes("#") || source.includes("//") || source.includes("/*");
}

function printFile(file: FileNode): string {
	const modelHeaders = [file.model, ...file.submodels].map(
		(model) => `${model.kind} ${model.id}`,
	);
	const parts: string[] = [modelHeaders.join("\n")];
	for (const decl of file.decls) {
		parts.push("");
		parts.push(printDecl(decl));
	}
	return parts.join("\n") + "\n";
}

function printDecl(decl: DeclarationNode): string {
	switch (decl.type) {
		case "TimeDeclaration":
			return printTimeDeclaration(decl);
		case "StockDeclaration":
			return printStockDeclaration(decl);
		case "AuxiliaryDeclaration":
			return printAuxiliaryDeclaration(decl);
		case "FlowDeclaration":
			return printFlowDeclaration(decl);
		case "ConnectionDeclaration":
			return printConnectionDeclaration(decl);
		case "GraphicalFunctionDeclaration":
			return printGraphicalFunctionDeclaration(decl);
	}
}

function printTimeDeclaration(decl: TimeDeclarationNode): string {
	const order = ["start", "end", "step", "save_step"] as const;
	const lines = order.flatMap((key) => {
		const prop = decl.props.find((p) => p.key === key);
		return prop ? [`  ${key}: ${prop.value.value}`] : [];
	});
	if (decl.method) {
		lines.push(`  method: ${decl.method.value}`);
	}
	if (decl.timeUnits) {
		lines.push(`  time_units: ${decl.timeUnits.value}`);
	}
	return `time {\n${lines.join("\n")}\n}`;
}

function printStockDeclaration(decl: StockDeclarationNode): string {
	const lines = [`stock ${decl.id} {`];
	for (const prop of decl.props) {
		lines.push(`  init: ${printExpr(prop.init)}`);
	}
	if (decl.position) lines.push(`  position: ${printPos(decl.position)}`);
	lines.push("}");
	return lines.join("\n");
}

function printAuxiliaryDeclaration(decl: AuxiliaryDeclarationNode): string {
	const head = decl.expr
		? `aux ${decl.id} = ${printExpr(decl.expr)}`
		: `aux ${decl.id}`;
	if (decl.position === undefined) return head;
	return `${head} { position: ${printPos(decl.position)} }`;
}

function printFlowDeclaration(decl: FlowDeclarationNode): string {
	const linesByKey = new Map<FlowPropertyNode["key"], string>();
	for (const prop of decl.props) {
		switch (prop.key) {
			case "from":
			case "to":
				linesByKey.set(
					prop.key,
					`  ${prop.key}: ${prop.value.value ?? "null"}`,
				);
				break;
			case "rate":
				linesByKey.set(prop.key, `  rate: ${printExpr(prop.value)}`);
				break;
		}
	}
	const order: FlowPropertyNode["key"][] = ["from", "to", "rate"];
	const lines = order.flatMap((key) => {
		const line = linesByKey.get(key);
		return line === undefined ? [] : [line];
	});
	if (decl.position) lines.push(`  position: ${printPos(decl.position)}`);
	if (decl.via?.length) lines.push(`  via: ${printPosArray(decl.via)}`);
	return `flow ${decl.id} {\n${lines.join("\n")}\n}`;
}

function printConnectionDeclaration(decl: ConnectionDeclarationNode): string {
	const arrow =
		decl.polarity === "+" ? "->+" : decl.polarity === "-" ? "->-" : "=>";
	const base = `${decl.from} ${arrow} ${decl.to}`;
	if (decl.angle === undefined && !decl.via) return base;
	const propLines: string[] = [];
	if (decl.angle !== undefined) propLines.push(`  angle: ${decl.angle}`);
	if (decl.via) propLines.push(`  via: ${printPos(decl.via)}`);
	return `${base} {\n${propLines.join("\n")}\n}`;
}

function printGraphicalFunctionDeclaration(
	decl: GraphicalFunctionDeclarationNode,
): string {
	const lines = printGraphicalFunctionBodyProps(decl.body);
	return `gf ${decl.id} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
}

function printGraphicalFunctionBodyProps(
	body: GraphicalFunctionBodyNode,
): string[] {
	const order = ["kind", "xscale", "xpts", "ypts", "yscale"] as const;
	return order.flatMap((key) => {
		const prop = body.props.find((p) => p.key === key);
		if (!prop) return [];
		if (prop.key === "kind") return [`kind: ${prop.value}`];
		return [`${prop.key}: ${printNumberList(prop.value)}`];
	});
}

function printNumberList(list: NumberListNode): string {
	const values = list.values.map(
		(signedNumber) =>
			`${signedNumber.negative ? "-" : ""}${signedNumber.lit.value}`,
	);
	return `[${values.join(", ")}]`;
}

function printPos(pos: PositionNode): string {
	return `{ x: ${pos.x}, y: ${pos.y} }`;
}

function printPosArray(positions: PositionNode[]): string {
	return `[${positions.map(printPos).join(", ")}]`;
}

function printExpr(expr: ExpressionNode): string {
	switch (expr.type) {
		case "NumberLiteral":
			return expr.value;
		case "IdentifierReference":
			return expr.name;
		case "GroupedExpression":
			return `(${printExpr(expr.expr)})`;
		case "BinaryExpression":
			return `${printExpr(expr.left)} ${expr.op} ${printExpr(expr.right)}`;
		case "UnaryExpression":
			return expr.op === "NOT"
				? `NOT ${printExpr(expr.operand)}`
				: `${expr.op}${printExpr(expr.operand)}`;
		case "FunctionCall":
			return `${expr.name}(${expr.args.map(printExpr).join(", ")})`;
		case "IfThenElse":
			return `IF ${printExpr(expr.cond)} THEN ${printExpr(expr.thenBranch)} ELSE ${printExpr(expr.elseBranch)}`;
	}
}
