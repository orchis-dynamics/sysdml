import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	AuxiliaryDeclarationNode,
	FunctionCallNode,
	IdentifierReferenceNode,
} from "../src/index.js";

function auxExpr(src: string) {
	const { ast, diagnostics } = parseSource(`model m\naux x = ${src}`);
	expect(diagnostics).toHaveLength(0);
	if (ast === null) throw new Error(`expected non-null ast for: ${src}`);
	const decl = ast.decls[0] as AuxiliaryDeclarationNode;
	expect(decl.type).toBe("AuxiliaryDeclaration");
	if (decl.expr === null) throw new Error(`expected non-null expr for: ${src}`);
	return decl.expr;
}

function isFunctionCall(node: unknown): node is FunctionCallNode {
	return (node as FunctionCallNode).type === "FunctionCall";
}

// ── Happy path ────────────────────────────────────────────────────────────────

describe("function call syntax", () => {
	test("single argument", () => {
		const expr = auxExpr("ABS(y)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) {
			expect(expr.name).toBe("ABS");
			expect(expr.args).toHaveLength(1);
			const firstArg = expr.args[0];
			if (firstArg === undefined) throw new Error("expected first arg");
			expect(firstArg.type).toBe("IdentifierReference");
		}
	});

	test("case is preserved at AST level", () => {
		const expr = auxExpr("abs(y)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) expect(expr.name).toBe("abs");
	});

	test("two arguments", () => {
		const expr = auxExpr("MIN(a, b)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) {
			expect(expr.name).toBe("MIN");
			expect(expr.args).toHaveLength(2);
		}
	});

	test("three arguments", () => {
		const expr = auxExpr("DELAY1(a, b, c)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) expect(expr.args).toHaveLength(3);
	});

	test("four arguments", () => {
		const expr = auxExpr("DELAYN(a, b, c, d)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) expect(expr.args).toHaveLength(4);
	});

	test("zero arguments with parens", () => {
		const expr = auxExpr("TIME()");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) {
			expect(expr.name).toBe("TIME");
			expect(expr.args).toHaveLength(0);
		}
	});

	test("PI() with no args", () => {
		const expr = auxExpr("PI()");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) expect(expr.args).toHaveLength(0);
	});

	test("nested call in argument", () => {
		const expr = auxExpr("MAX(ABS(x), 0)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) {
			const secondArg = expr.args[1];
			if (secondArg === undefined) throw new Error("expected second arg");
			expect(isFunctionCall(expr.args[0])).toBe(true);
			expect(secondArg.type).toBe("NumberLiteral");
		}
	});

	test("arithmetic expression as argument", () => {
		const expr = auxExpr("ABS(x + 1)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) {
			const firstArg = expr.args[0];
			if (firstArg === undefined) throw new Error("expected first arg");
			expect(firstArg.type).toBe("BinaryExpression");
		}
	});

	test("unknown name parses fine (compiler rejects it, not parser)", () => {
		const { ast, diagnostics } = parseSource(`model m\naux x = unknown_fn(1)`);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});

	test("nameSpan covers only the function name token", () => {
		const expr = auxExpr("SQRT(y)");
		expect(isFunctionCall(expr)).toBe(true);
		if (isFunctionCall(expr)) {
			// span width == length of "SQRT" (4 chars: col start to col start+3)
			const width = expr.nameSpan.end.col - expr.nameSpan.start.col + 1;
			expect(width).toBe(4);
			// nameSpan ends before the opening paren
			expect(expr.nameSpan.end.col).toBeLessThan(expr.span.end.col);
		}
	});
});

// ── Bare zero-arg identifiers (parens optional) ───────────────────────────────

describe("bare zero-arg identifiers", () => {
	test("TIME without parens parses as IdentifierReference", () => {
		// Resolution to FunctionCall happens at IR level
		const expr = auxExpr("TIME");
		expect(expr.type).toBe("IdentifierReference");
		expect((expr as IdentifierReferenceNode).name).toBe("TIME");
	});

	test("PI without parens parses as IdentifierReference", () => {
		const expr = auxExpr("PI");
		expect(expr.type).toBe("IdentifierReference");
	});
});

// ── One parse-level test per stdlib category ──────────────────────────────────

describe("grammar handles all arity patterns", () => {
	test("1-arg: SQRT(x)", () =>
		expect(isFunctionCall(auxExpr("SQRT(x)"))).toBe(true));
	test("2-arg: MAX(a, b)", () =>
		expect(isFunctionCall(auxExpr("MAX(a, b)"))).toBe(true));
	test("3-arg: DELAY1(a, b, c)", () =>
		expect(isFunctionCall(auxExpr("DELAY1(a, b, c)"))).toBe(true));
	test("4-arg: DELAYN(a, b, c, d)", () =>
		expect(isFunctionCall(auxExpr("DELAYN(a, b, c, d)"))).toBe(true));
	test("nested arithmetic in args: ABS(x + 1)", () => {
		const expr = auxExpr("ABS(x + 1)");
		expect(isFunctionCall(expr)).toBe(true);
	});
});
