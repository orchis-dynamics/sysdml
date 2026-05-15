import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	AuxDeclNode,
	BinaryExprNode,
	ExprNode,
	IfThenElseNode,
	UnaryExprNode,
} from "../src/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function auxExpr(src: string): ExprNode {
	const { ast, diagnostics } = parseSource(`model m\naux x = ${src}`);
	expect(diagnostics, `parse errors for ${src}`).toHaveLength(0);
	if (ast === null) throw new Error(`expected non-null ast for: ${src}`);
	const decl = ast.decls[0] as AuxDeclNode;
	expect(decl.type).toBe("AuxDecl");
	if (decl.expr === null) throw new Error(`expected non-null expr for: ${src}`);
	return decl.expr;
}

function parseFails(src: string) {
	const { diagnostics } = parseSource(`model m\naux x = ${src}`);
	expect(
		diagnostics.length,
		`expected parse failure for ${src}`,
	).toBeGreaterThan(0);
}

function isBinaryExpr(n: ExprNode): n is BinaryExprNode {
	return n.type === "BinaryExpr";
}
function isUnaryExpr(n: ExprNode): n is UnaryExprNode {
	return n.type === "UnaryExpr";
}
function isIfThenElse(n: ExprNode): n is IfThenElseNode {
	return n.type === "IfThenElse";
}

/** Recursively strip span/nameSpan fields so two AST trees from different surface
 *  syntax (e.g. `a && b` vs `a AND b`) can be compared structurally. */
function stripSpans(node: unknown): unknown {
	if (Array.isArray(node)) return node.map(stripSpans);
	if (node && typeof node === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(node)) {
			if (
				k === "span" ||
				k === "nameSpan" ||
				k === "idSpan" ||
				k === "fromSpan" ||
				k === "toSpan"
			)
				continue;
			out[k] = stripSpans(v);
		}
		return out;
	}
	return node;
}

// ── Comparison operators ──────────────────────────────────────────────────────

describe("comparison operators", () => {
	for (const op of ["<", "<=", ">", ">=", "=", "<>"] as const) {
		test(`a ${op} b`, () => {
			const e = auxExpr(`a ${op} b`);
			expect(isBinaryExpr(e)).toBe(true);
			if (isBinaryExpr(e)) {
				expect(e.op).toBe(op);
				expect(e.left.type).toBe("IdentRef");
				expect(e.right.type).toBe("IdentRef");
			}
		});
	}

	test("chained comparison is left-associative: a < b < c → (a < b) < c", () => {
		const e = auxExpr("a < b < c");
		expect(isBinaryExpr(e)).toBe(true);
		if (isBinaryExpr(e)) {
			expect(e.op).toBe("<");
			expect(isBinaryExpr(e.left) && e.left.op === "<").toBe(true);
			expect(e.right.type).toBe("IdentRef");
		}
	});
});

// ── Logical operators ─────────────────────────────────────────────────────────

describe("logical operators", () => {
	test("a AND b", () => {
		const e = auxExpr("a AND b");
		expect(isBinaryExpr(e)).toBe(true);
		if (isBinaryExpr(e)) expect(e.op).toBe("AND");
	});

	test("a OR b", () => {
		const e = auxExpr("a OR b");
		expect(isBinaryExpr(e)).toBe(true);
		if (isBinaryExpr(e)) expect(e.op).toBe("OR");
	});

	test("NOT a", () => {
		const e = auxExpr("NOT a");
		expect(isUnaryExpr(e)).toBe(true);
		if (isUnaryExpr(e)) {
			expect(e.op).toBe("NOT");
			expect(e.operand.type).toBe("IdentRef");
		}
	});

	test("NOT NOT a — nested unary", () => {
		const e = auxExpr("NOT NOT a");
		expect(isUnaryExpr(e) && e.op === "NOT").toBe(true);
		if (isUnaryExpr(e)) {
			expect(isUnaryExpr(e.operand) && e.operand.op === "NOT").toBe(true);
		}
	});

	test("a AND b OR c → (a AND b) OR c (AND binds tighter)", () => {
		const e = auxExpr("a AND b OR c");
		expect(isBinaryExpr(e) && e.op === "OR").toBe(true);
		if (isBinaryExpr(e)) {
			expect(isBinaryExpr(e.left) && e.left.op === "AND").toBe(true);
			expect(e.right.type).toBe("IdentRef");
		}
	});

	test('lowercase "and" is identifier, not operator', () => {
		// `a and b` — "and" lowercased is just an identifier; this should fail
		// because two identifiers in a row is not a valid expression.
		parseFails("a and b");
	});
});

// ── Precedence — mixed levels ────────────────────────────────────────────────

describe("mixed precedence", () => {
	test("a + b < c * d → (a + b) < (c * d)", () => {
		const e = auxExpr("a + b < c * d");
		expect(isBinaryExpr(e) && e.op === "<").toBe(true);
		if (isBinaryExpr(e)) {
			expect(isBinaryExpr(e.left) && e.left.op === "+").toBe(true);
			expect(isBinaryExpr(e.right) && e.right.op === "*").toBe(true);
		}
	});

	test("NOT a OR b → (NOT a) OR b (NOT binds tighter)", () => {
		const e = auxExpr("NOT a OR b");
		expect(isBinaryExpr(e) && e.op === "OR").toBe(true);
		if (isBinaryExpr(e)) {
			expect(isUnaryExpr(e.left) && e.left.op === "NOT").toBe(true);
			expect(e.right.type).toBe("IdentRef");
		}
	});

	test("a < b AND c < d → (a < b) AND (c < d)", () => {
		const e = auxExpr("a < b AND c < d");
		expect(isBinaryExpr(e) && e.op === "AND").toBe(true);
		if (isBinaryExpr(e)) {
			expect(isBinaryExpr(e.left) && e.left.op === "<").toBe(true);
			expect(isBinaryExpr(e.right) && e.right.op === "<").toBe(true);
		}
	});

	test("a = b OR c = d → (a = b) OR (c = d)", () => {
		const e = auxExpr("a = b OR c = d");
		expect(isBinaryExpr(e) && e.op === "OR").toBe(true);
		if (isBinaryExpr(e)) {
			expect(isBinaryExpr(e.left) && e.left.op === "=").toBe(true);
			expect(isBinaryExpr(e.right) && e.right.op === "=").toBe(true);
		}
	});

	test("-a < b → (-a) < b (unary minus binds tighter than <)", () => {
		const e = auxExpr("-a < b");
		expect(isBinaryExpr(e) && e.op === "<").toBe(true);
		if (isBinaryExpr(e)) {
			expect(isUnaryExpr(e.left) && e.left.op === "-").toBe(true);
		}
	});
});

// ── IF/THEN/ELSE ─────────────────────────────────────────────────────────────

describe("IF/THEN/ELSE", () => {
	test("basic IF a THEN b ELSE c", () => {
		const e = auxExpr("IF a THEN b ELSE c");
		expect(isIfThenElse(e)).toBe(true);
		if (isIfThenElse(e)) {
			expect(e.cond.type).toBe("IdentRef");
			expect(e.thenBranch.type).toBe("IdentRef");
			expect(e.elseBranch.type).toBe("IdentRef");
		}
	});

	test("IF with comparison condition: IF a > 0 AND b > 0 THEN a + b ELSE 0", () => {
		const e = auxExpr("IF a > 0 AND b > 0 THEN a + b ELSE 0");
		expect(isIfThenElse(e)).toBe(true);
		if (isIfThenElse(e)) {
			expect(isBinaryExpr(e.cond) && e.cond.op === "AND").toBe(true);
			expect(isBinaryExpr(e.thenBranch) && e.thenBranch.op === "+").toBe(true);
			expect(e.elseBranch.type).toBe("NumberLit");
		}
	});

	test("nested IF: dangling ELSE binds to inner IF", () => {
		// IF a THEN IF b THEN c ELSE d ELSE e
		// Outer: cond=a, then=(IF b THEN c ELSE d), else=e
		const e = auxExpr("IF a THEN IF b THEN c ELSE d ELSE e");
		expect(isIfThenElse(e)).toBe(true);
		if (isIfThenElse(e)) {
			expect(e.cond.type).toBe("IdentRef");
			expect(isIfThenElse(e.thenBranch)).toBe(true);
			if (isIfThenElse(e.thenBranch)) {
				expect(e.thenBranch.cond.type).toBe("IdentRef"); // b
				expect(e.thenBranch.thenBranch.type).toBe("IdentRef"); // c
				expect(e.thenBranch.elseBranch.type).toBe("IdentRef"); // d
			}
			expect(e.elseBranch.type).toBe("IdentRef"); // e
		}
	});

	test("missing ELSE → parse error", () => {
		parseFails("IF a THEN b");
	});

	test("missing THEN → parse error", () => {
		parseFails("IF a b ELSE c");
	});
});

// ── C-style operator aliases ──────────────────────────────────────────────────
// Aliases fold to canonical XMILE op strings at the AST level, so `a && b`
// and `a AND b` produce byte-identical AST.

describe("C-style aliases fold to canonical AST", () => {
	// Spans differ because aliases have different character widths (e.g. `&&` is 2,
	// `AND` is 3); we compare structural AST only.
	const assertStructurallyEqual = (leftSource: string, rightSource: string) =>
		expect(stripSpans(auxExpr(leftSource))).toEqual(
			stripSpans(auxExpr(rightSource)),
		);

	test("a && b ≡ a AND b", () => assertStructurallyEqual("a && b", "a AND b"));
	test("a || b ≡ a OR b", () => assertStructurallyEqual("a || b", "a OR b"));
	test("!a ≡ NOT a", () => assertStructurallyEqual("!a", "NOT a"));
	test("a == b ≡ a = b", () => assertStructurallyEqual("a == b", "a = b"));
	test("a != b ≡ a <> b", () => assertStructurallyEqual("a != b", "a <> b"));
	test("!!a ≡ NOT NOT a", () => assertStructurallyEqual("!!a", "NOT NOT a"));
	test("mixed: a && b OR !c ≡ a AND b OR NOT c", () =>
		assertStructurallyEqual("a && b OR !c", "a AND b OR NOT c"));
	test("full C-style ≡ XMILE equivalent", () =>
		assertStructurallyEqual(
			"(a == 5) && (b != 0) || !c",
			"(a = 5) AND (b <> 0) OR NOT c",
		));

	test("aux assignment is still single-= only (== is parse error in auxDecl position)", () => {
		// `aux x == 5` would be: AUX IDENT then EQ_EQ — auxDecl rule requires single EQ
		const { diagnostics } = parseSource(`model m\naux x == 5`);
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("aux x = a == 5 — single = is assignment, == is equality", () => {
		// Should parse: x is assigned the result of (a == 5)
		const e = auxExpr("a == 5");
		expect(isBinaryExpr(e) && e.op === "=").toBe(true);
	});
});

// ── Existing rule references still work ──────────────────────────────────────

describe("integration with other rules", () => {
	test("aux x = a < b parses", () => {
		expect(() => auxExpr("a < b")).not.toThrow();
	});

	test("stock { init: a > 0 } parses", () => {
		const { ast, diagnostics } = parseSource(
			`model m\nstock s { init: a > 0 }`,
		);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});

	test("flow { rate: IF a THEN b ELSE c } parses", () => {
		const { ast, diagnostics } = parseSource(
			`model m\nstock s { init: 0 }\nflow f { from: null  to: s  rate: IF a THEN b ELSE c }`,
		);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});
});
