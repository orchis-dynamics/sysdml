import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";

import { DiagnosticCode } from "@sysdml/contracts";
import type { IRExpressionNode } from "@sysdml/contracts";
import { compileAST } from "../src/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parse(src: string) {
	const { ast, diagnostics } = parseSource(src);
	if (diagnostics.length > 0)
		throw new Error(`Parse error: ${diagnostics[0].message}`);
	return ast!;
}

function compileExpressionSource(expressionSource: string) {
	const src = `
sfd m
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux a = 1
aux b = 1
aux c = 1
aux d = 1
aux result = ${expressionSource}
`;
	return compileAST(parse(src));
}

function getResultExpression(expressionSource: string): IRExpressionNode {
	const { ir, diagnostics } = compileExpressionSource(expressionSource);
	expect(
		diagnostics,
		`unexpected diagnostics for ${expressionSource}`,
	).toHaveLength(0);
	expect(ir).not.toBeNull();
	return ir!.auxiliaries[ir!.auxiliaries.length - 1].expr!;
}

const createRefNode = (id: string): IRExpressionNode => ({
	type: "Reference",
	id,
});
const createNumNode = (value: number): IRExpressionNode => ({
	type: "Number",
	value,
});

// ── Comparison operators ──────────────────────────────────────────────────────

describe("comparison operators in IR", () => {
	for (const op of ["<", "<=", ">", ">=", "=", "<>"] as const) {
		test(`a ${op} b → BinOp(${op})`, () => {
			expect(getResultExpression(`a ${op} b`)).toEqual({
				type: "BinaryOperation",
				op,
				left: createRefNode("a"),
				right: createRefNode("b"),
			});
		});
	}
});

// ── Logical operators ─────────────────────────────────────────────────────────

describe("logical operators in IR", () => {
	test("a AND b → BinOp(AND)", () => {
		expect(getResultExpression("a AND b")).toEqual({
			type: "BinaryOperation",
			op: "AND",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("a OR b → BinOp(OR)", () => {
		expect(getResultExpression("a OR b")).toEqual({
			type: "BinaryOperation",
			op: "OR",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("NOT a → Not node", () => {
		expect(getResultExpression("NOT a")).toEqual({
			type: "Not",
			operand: createRefNode("a"),
		});
	});

	test("NOT NOT a → nested Not", () => {
		expect(getResultExpression("NOT NOT a")).toEqual({
			type: "Not",
			operand: { type: "Not", operand: createRefNode("a") },
		});
	});

	test("-a still → UnaryMinus (unchanged)", () => {
		expect(getResultExpression("-a")).toEqual({
			type: "UnaryMinus",
			operand: createRefNode("a"),
		});
	});
});

// ── IF/THEN/ELSE ─────────────────────────────────────────────────────────────

describe("IF/THEN/ELSE in IR", () => {
	test("IF a THEN b ELSE c → IfThenElse node", () => {
		expect(getResultExpression("IF a THEN b ELSE c")).toEqual({
			type: "IfThenElse",
			cond: createRefNode("a"),
			thenBranch: createRefNode("b"),
			elseBranch: createRefNode("c"),
		});
	});

	test("IF a > 0 THEN b ELSE c — condition is BinOp", () => {
		expect(getResultExpression("IF a > 0 THEN b ELSE c")).toEqual({
			type: "IfThenElse",
			cond: {
				type: "BinaryOperation",
				op: ">",
				left: createRefNode("a"),
				right: createNumNode(0),
			},
			thenBranch: createRefNode("b"),
			elseBranch: createRefNode("c"),
		});
	});

	test("IF_THEN_ELSE(a, b, c) lowers to identical IR as keyword form", () => {
		expect(getResultExpression("IF_THEN_ELSE(a, b, c)")).toEqual(
			getResultExpression("IF a THEN b ELSE c"),
		);
	});

	test("lowercase if_then_else(a, b, c) also lowers (case-insensitive)", () => {
		expect(getResultExpression("if_then_else(a, b, c)")).toEqual(
			getResultExpression("IF a THEN b ELSE c"),
		);
	});
});

// ── IF_THEN_ELSE arity errors ─────────────────────────────────────────────────

describe("IF_THEN_ELSE arity errors", () => {
	test("IF_THEN_ELSE(a, b) → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource("IF_THEN_ELSE(a, b)");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
		expect(diagnostics[0].message).toContain("IF_THEN_ELSE");
	});

	test("IF_THEN_ELSE(a, b, c, d) → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource(
			"IF_THEN_ELSE(a, b, c, d)",
		);
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
	});
});

// ── Precedence carries through to IR ─────────────────────────────────────────

describe("precedence in IR", () => {
	test("a + b < c * d → BinOp(<, (a+b), (c*d))", () => {
		expect(getResultExpression("a + b < c * d")).toEqual({
			type: "BinaryOperation",
			op: "<",
			left: {
				type: "BinaryOperation",
				op: "+",
				left: createRefNode("a"),
				right: createRefNode("b"),
			},
			right: {
				type: "BinaryOperation",
				op: "*",
				left: createRefNode("c"),
				right: createRefNode("d"),
			},
		});
	});

	test("NOT a OR b → BinOp(OR, Not(a), b)", () => {
		expect(getResultExpression("NOT a OR b")).toEqual({
			type: "BinaryOperation",
			op: "OR",
			left: { type: "Not", operand: createRefNode("a") },
			right: createRefNode("b"),
		});
	});

	test("a AND b OR c → BinOp(OR, BinOp(AND, a, b), c)", () => {
		expect(getResultExpression("a AND b OR c")).toEqual({
			type: "BinaryOperation",
			op: "OR",
			left: {
				type: "BinaryOperation",
				op: "AND",
				left: createRefNode("a"),
				right: createRefNode("b"),
			},
			right: createRefNode("c"),
		});
	});
});

// ── C-style alias IR equivalence ──────────────────────────────────────────────

describe("C-style aliases produce identical IR", () => {
	test("a && b → BinOp(AND)", () => {
		expect(getResultExpression("a && b")).toEqual({
			type: "BinaryOperation",
			op: "AND",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("a || b → BinOp(OR)", () => {
		expect(getResultExpression("a || b")).toEqual({
			type: "BinaryOperation",
			op: "OR",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("!a → Not", () => {
		expect(getResultExpression("!a")).toEqual({
			type: "Not",
			operand: createRefNode("a"),
		});
	});

	test("a == b → BinOp(=)", () => {
		expect(getResultExpression("a == b")).toEqual({
			type: "BinaryOperation",
			op: "=",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("a != b → BinOp(<>)", () => {
		expect(getResultExpression("a != b")).toEqual({
			type: "BinaryOperation",
			op: "<>",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("IF_THEN_ELSE(a == 5 && !b, c, d) ≡ IF a = 5 AND NOT b THEN c ELSE d", () => {
		expect(getResultExpression("IF_THEN_ELSE(a == 5 && !b, c, d)")).toEqual(
			getResultExpression("IF a = 5 AND NOT b THEN c ELSE d"),
		);
	});
});

// ── Exponentiation (^) ───────────────────────────────────────────────────────

describe("exponentiation operator in IR", () => {
	test("a ^ b → BinOp(^)", () => {
		expect(getResultExpression("a ^ b")).toEqual({
			type: "BinaryOperation",
			op: "^",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("a ^ b ^ c is right-associative: a ^ (b ^ c)", () => {
		expect(getResultExpression("a ^ b ^ c")).toEqual({
			type: "BinaryOperation",
			op: "^",
			left: createRefNode("a"),
			right: {
				type: "BinaryOperation",
				op: "^",
				left: createRefNode("b"),
				right: createRefNode("c"),
			},
		});
	});

	test("-a ^ b is -(a ^ b): unary minus lower precedence than ^", () => {
		expect(getResultExpression("-a ^ b")).toEqual({
			type: "UnaryMinus",
			operand: {
				type: "BinaryOperation",
				op: "^",
				left: createRefNode("a"),
				right: createRefNode("b"),
			},
		});
	});

	test("a ^ b * c is (a ^ b) * c: ^ higher precedence than *", () => {
		expect(getResultExpression("a ^ b * c")).toEqual({
			type: "BinaryOperation",
			op: "*",
			left: {
				type: "BinaryOperation",
				op: "^",
				left: createRefNode("a"),
				right: createRefNode("b"),
			},
			right: createRefNode("c"),
		});
	});
});

// ── Unary plus ────────────────────────────────────────────────────────────────

describe("unary plus in IR", () => {
	test("+a folds to Ref(a) — identity at AST level", () => {
		expect(getResultExpression("+a")).toEqual(createRefNode("a"));
	});

	test("+-a folds to UnaryMinus(a)", () => {
		expect(getResultExpression("+-a")).toEqual({
			type: "UnaryMinus",
			operand: createRefNode("a"),
		});
	});

	test("+5 folds to Num(5)", () => {
		expect(getResultExpression("+5")).toEqual(createNumNode(5));
	});
});

// ── MOD operator ─────────────────────────────────────────────────────────────

describe("MOD operator in IR", () => {
	test("a MOD b → BinOp(MOD)", () => {
		expect(getResultExpression("a MOD b")).toEqual({
			type: "BinaryOperation",
			op: "MOD",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("a MOD b * c is left-associative: (a MOD b) * c", () => {
		expect(getResultExpression("a MOD b * c")).toEqual({
			type: "BinaryOperation",
			op: "*",
			left: {
				type: "BinaryOperation",
				op: "MOD",
				left: createRefNode("a"),
				right: createRefNode("b"),
			},
			right: createRefNode("c"),
		});
	});
});

// ── No regressions on existing arithmetic ────────────────────────────────────

describe("arithmetic still compiles unchanged", () => {
	test("a + b → BinOp(+)", () => {
		expect(getResultExpression("a + b")).toEqual({
			type: "BinaryOperation",
			op: "+",
			left: createRefNode("a"),
			right: createRefNode("b"),
		});
	});

	test("a * b - c / d", () => {
		expect(getResultExpression("a * b - c / d")).toEqual({
			type: "BinaryOperation",
			op: "-",
			left: {
				type: "BinaryOperation",
				op: "*",
				left: createRefNode("a"),
				right: createRefNode("b"),
			},
			right: {
				type: "BinaryOperation",
				op: "/",
				left: createRefNode("c"),
				right: createRefNode("d"),
			},
		});
	});
});
