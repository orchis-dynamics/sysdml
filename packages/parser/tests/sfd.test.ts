import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	AuxiliaryDeclarationNode,
	DeclarationNode,
	ExpressionNode,
	FlowDeclarationNode,
	StockDeclarationNode,
	TimeDeclarationNode,
	UnaryExpressionNode,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
	return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

function isTimeDeclaration(n: DeclarationNode): n is TimeDeclarationNode {
	return n.type === "TimeDeclaration";
}
function isStockDeclaration(n: DeclarationNode): n is StockDeclarationNode {
	return n.type === "StockDeclaration";
}
function isAuxiliaryDeclaration(n: DeclarationNode): n is AuxiliaryDeclarationNode {
	return n.type === "AuxiliaryDeclaration";
}
function isFlowDeclaration(n: DeclarationNode): n is FlowDeclarationNode {
	return n.type === "FlowDeclaration";
}
function isUnaryExpression(n: ExpressionNode): n is UnaryExpressionNode {
	return n.type === "UnaryExpression";
}

describe("SFD parsing", () => {
	test("parses population_growth.sysdml with no diagnostics", () => {
		const result = parseSource(fixture("population_growth.sysdml"));
		expect(result.diagnostics).toHaveLength(0);
		expect(result.ast).not.toBeNull();
	});

	test("file node has correct model id", () => {
		const { ast } = parseSource(fixture("population_growth.sysdml"));
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.model.id).toBe("population_growth");
	});

	test("time decl has correct props", () => {
		const { ast } = parseSource(fixture("population_growth.sysdml"));
		if (ast === null) throw new Error("expected non-null ast");
		const time = ast.decls.find(isTimeDeclaration);
		if (time === undefined) throw new Error("expected TimeDeclaration in decls");
		const keys = time.props.map((property) => property.key);
		expect(keys).toContain("start");
		expect(keys).toContain("end");
		expect(keys).toContain("step");
		const stepProp = time.props.find((property) => property.key === "step");
		if (stepProp === undefined) throw new Error("expected 'step' prop");
		expect(stepProp.value.value).toBe("1");
	});

	test("stock decl has init value", () => {
		const { ast } = parseSource(fixture("population_growth.sysdml"));
		if (ast === null) throw new Error("expected non-null ast");
		const stock = ast.decls.find(isStockDeclaration);
		if (stock === undefined) throw new Error("expected StockDeclaration in decls");
		expect(stock.id).toBe("population");
		expect(stock.props).toHaveLength(1);
		expect(stock.props[0].init.type).toBe("NumberLiteral");
	});

	test("aux decl", () => {
		const { ast } = parseSource(fixture("population_growth.sysdml"));
		if (ast === null) throw new Error("expected non-null ast");
		const aux = ast.decls.find(isAuxiliaryDeclaration);
		if (aux === undefined) throw new Error("expected AuxiliaryDeclaration in decls");
		expect(aux.id).toBe("birth_rate");
		expect(aux.expr.type).toBe("NumberLiteral");
	});

	test("flow decl with null endpoint and binary expr rate", () => {
		const { ast } = parseSource(fixture("population_growth.sysdml"));
		if (ast === null) throw new Error("expected non-null ast");
		const flow = ast.decls.find(isFlowDeclaration);
		if (flow === undefined) throw new Error("expected FlowDeclaration in decls");
		expect(flow.id).toBe("births");

		const fromProp = flow.props.find((property) => property.key === "from");
		if (fromProp === undefined) throw new Error("expected 'from' prop");
		expect(fromProp.value.type).toBe("Endpoint");
		if (fromProp.key === "from") expect(fromProp.value.value).toBeNull();

		const toProp = flow.props.find((property) => property.key === "to");
		if (toProp === undefined) throw new Error("expected 'to' prop");
		expect(toProp.value.type).toBe("Endpoint");
		if (toProp.key === "to") expect(toProp.value.value).toBe("population");

		const rateProp = flow.props.find((property) => property.key === "rate");
		if (rateProp === undefined) throw new Error("expected 'rate' prop");
		expect(rateProp.value.type).toBe("BinaryExpression");
	});

	test("minimal inline model parses", () => {
		const src = `model m\naux x = 42`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.model.id).toBe("m");
		const aux = ast.decls.find(isAuxiliaryDeclaration);
		if (aux === undefined) throw new Error("expected AuxiliaryDeclaration in decls");
		expect(aux.type).toBe("AuxiliaryDeclaration");
		expect(aux.id).toBe("x");
	});

	test("unary minus on aux expr", () => {
		const src = `model m\naux x = -1`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected non-null ast");
		const aux = ast.decls.find(isAuxiliaryDeclaration);
		if (aux === undefined) throw new Error("expected AuxiliaryDeclaration in decls");
		expect(aux.expr.type).toBe("UnaryExpression");
		expect(isUnaryExpression(aux.expr)).toBe(true);
		if (isUnaryExpression(aux.expr)) {
			expect(aux.expr.op).toBe("-");
			expect(aux.expr.operand.type).toBe("NumberLiteral");
		}
	});

	test("grouped expression parses", () => {
		const src = `model m\naux x = (1 + 2) * 3`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected non-null ast");
		const aux = ast.decls.find(isAuxiliaryDeclaration);
		if (aux === undefined) throw new Error("expected AuxiliaryDeclaration in decls");
		expect(aux.expr.type).toBe("BinaryExpression");
	});

	test("determinism: same source produces identical AST JSON", () => {
		const src = fixture("population_growth.sysdml");
		const a = parseSource(src);
		const b = parseSource(src);
		expect(JSON.stringify(a.ast)).toBe(JSON.stringify(b.ast));
	});
});
