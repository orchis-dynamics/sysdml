import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	AuxiliaryDeclarationNode,
	BinaryExpressionNode,
	DeclarationNode,
	ExpressionNode,
	IfThenElseNode,
	UnaryExpressionNode,
} from "../src/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAuxiliaryDeclaration(
	n: DeclarationNode,
): n is AuxiliaryDeclarationNode {
	return n.type === "AuxiliaryDeclaration";
}

function auxExpr(src: string): ExpressionNode {
	const { ast, diagnostics } = parseSource(`sfd m\naux x = ${src}`);
	expect(diagnostics, `parse errors for ${src}`).toHaveLength(0);
	if (ast === null) throw new Error(`expected non-null ast for: ${src}`);
	const decl = ast.decls[0];
	if (decl === undefined || !isAuxiliaryDeclaration(decl))
		throw new Error(`expected AuxiliaryDeclaration for: ${src}`);
	return decl.expr;
}

function parseFails(src: string) {
	const { diagnostics } = parseSource(`sfd m\naux x = ${src}`);
	expect(
		diagnostics.length,
		`expected parse failure for ${src}`,
	).toBeGreaterThan(0);
}

function isBinaryExpression(n: ExpressionNode): n is BinaryExpressionNode {
	return n.type === "BinaryExpression";
}
function isUnaryExpression(n: ExpressionNode): n is UnaryExpressionNode {
	return n.type === "UnaryExpression";
}
function isIfThenElse(n: ExpressionNode): n is IfThenElseNode {
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
			expect(isBinaryExpression(e)).toBe(true);
			if (isBinaryExpression(e)) {
				expect(e.op).toBe(op);
				expect(e.left.type).toBe("IdentifierReference");
				expect(e.right.type).toBe("IdentifierReference");
			}
		});
	}

	test("chained comparison is left-associative: a < b < c → (a < b) < c", () => {
		const e = auxExpr("a < b < c");
		expect(isBinaryExpression(e)).toBe(true);
		if (isBinaryExpression(e)) {
			expect(e.op).toBe("<");
			expect(isBinaryExpression(e.left) && e.left.op === "<").toBe(true);
			expect(e.right.type).toBe("IdentifierReference");
		}
	});
});

// ── Logical operators ─────────────────────────────────────────────────────────

describe("logical operators", () => {
	test("a AND b", () => {
		const e = auxExpr("a AND b");
		expect(isBinaryExpression(e)).toBe(true);
		if (isBinaryExpression(e)) expect(e.op).toBe("AND");
	});

	test("a OR b", () => {
		const e = auxExpr("a OR b");
		expect(isBinaryExpression(e)).toBe(true);
		if (isBinaryExpression(e)) expect(e.op).toBe("OR");
	});

	test("NOT a", () => {
		const e = auxExpr("NOT a");
		expect(isUnaryExpression(e)).toBe(true);
		if (isUnaryExpression(e)) {
			expect(e.op).toBe("NOT");
			expect(e.operand.type).toBe("IdentifierReference");
		}
	});

	test("NOT NOT a — nested unary", () => {
		const e = auxExpr("NOT NOT a");
		expect(isUnaryExpression(e) && e.op === "NOT").toBe(true);
		if (isUnaryExpression(e)) {
			expect(isUnaryExpression(e.operand) && e.operand.op === "NOT").toBe(true);
		}
	});

	test("a AND b OR c → (a AND b) OR c (AND binds tighter)", () => {
		const e = auxExpr("a AND b OR c");
		expect(isBinaryExpression(e) && e.op === "OR").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isBinaryExpression(e.left) && e.left.op === "AND").toBe(true);
			expect(e.right.type).toBe("IdentifierReference");
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
		expect(isBinaryExpression(e) && e.op === "<").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isBinaryExpression(e.left) && e.left.op === "+").toBe(true);
			expect(isBinaryExpression(e.right) && e.right.op === "*").toBe(true);
		}
	});

	test("NOT a OR b → (NOT a) OR b (NOT binds tighter)", () => {
		const e = auxExpr("NOT a OR b");
		expect(isBinaryExpression(e) && e.op === "OR").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isUnaryExpression(e.left) && e.left.op === "NOT").toBe(true);
			expect(e.right.type).toBe("IdentifierReference");
		}
	});

	test("a < b AND c < d → (a < b) AND (c < d)", () => {
		const e = auxExpr("a < b AND c < d");
		expect(isBinaryExpression(e) && e.op === "AND").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isBinaryExpression(e.left) && e.left.op === "<").toBe(true);
			expect(isBinaryExpression(e.right) && e.right.op === "<").toBe(true);
		}
	});

	test("a = b OR c = d → (a = b) OR (c = d)", () => {
		const e = auxExpr("a = b OR c = d");
		expect(isBinaryExpression(e) && e.op === "OR").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isBinaryExpression(e.left) && e.left.op === "=").toBe(true);
			expect(isBinaryExpression(e.right) && e.right.op === "=").toBe(true);
		}
	});

	test("-a < b → (-a) < b (unary minus binds tighter than <)", () => {
		const e = auxExpr("-a < b");
		expect(isBinaryExpression(e) && e.op === "<").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isUnaryExpression(e.left) && e.left.op === "-").toBe(true);
		}
	});
});

// ── Exponentiation ───────────────────────────────────────────────────────────

describe("exponentiation", () => {
	test("2*10^-6 → 2 * (10 ^ (-6))", () => {
		const e = auxExpr("2*10^-6");
		expect(isBinaryExpression(e) && e.op === "*").toBe(true);
		if (isBinaryExpression(e)) {
			expect(isBinaryExpression(e.right) && e.right.op === "^").toBe(true);
			if (isBinaryExpression(e.right)) {
				expect(
					isUnaryExpression(e.right.right) && e.right.right.op === "-",
				).toBe(true);
			}
		}
	});

	test("2^-3 → 2 ^ (-3)", () => {
		const e = auxExpr("2^-3");
		expect(isBinaryExpression(e) && e.op === "^").toBe(true);
		if (isBinaryExpression(e)) {
			expect(e.left.type).toBe("NumberLiteral");
			expect(isUnaryExpression(e.right) && e.right.op === "-").toBe(true);
		}
	});

	test("-a^2 → -(a^2) (^ binds tighter than unary minus)", () => {
		const e = auxExpr("-a^2");
		expect(isUnaryExpression(e) && e.op === "-").toBe(true);
		if (isUnaryExpression(e)) {
			expect(isBinaryExpression(e.operand) && e.operand.op === "^").toBe(true);
		}
	});

	test("a^b^c → a^(b^c) (right-associative)", () => {
		const e = auxExpr("a^b^c");
		expect(isBinaryExpression(e) && e.op === "^").toBe(true);
		if (isBinaryExpression(e)) {
			expect(e.left.type).toBe("IdentifierReference");
			expect(isBinaryExpression(e.right) && e.right.op === "^").toBe(true);
			if (isBinaryExpression(e.right)) {
				expect(e.right.left.type).toBe("IdentifierReference");
				expect(e.right.right.type).toBe("IdentifierReference");
			}
		}
	});
});

// ── IF/THEN/ELSE ─────────────────────────────────────────────────────────────

describe("IF/THEN/ELSE", () => {
	test("basic IF a THEN b ELSE c", () => {
		const e = auxExpr("IF a THEN b ELSE c");
		expect(isIfThenElse(e)).toBe(true);
		if (isIfThenElse(e)) {
			expect(e.cond.type).toBe("IdentifierReference");
			expect(e.thenBranch.type).toBe("IdentifierReference");
			expect(e.elseBranch.type).toBe("IdentifierReference");
		}
	});

	test("IF with comparison condition: IF a > 0 AND b > 0 THEN a + b ELSE 0", () => {
		const e = auxExpr("IF a > 0 AND b > 0 THEN a + b ELSE 0");
		expect(isIfThenElse(e)).toBe(true);
		if (isIfThenElse(e)) {
			expect(isBinaryExpression(e.cond) && e.cond.op === "AND").toBe(true);
			expect(isBinaryExpression(e.thenBranch) && e.thenBranch.op === "+").toBe(
				true,
			);
			expect(e.elseBranch.type).toBe("NumberLiteral");
		}
	});

	test("nested IF: dangling ELSE binds to inner IF", () => {
		// IF a THEN IF b THEN c ELSE d ELSE e
		// Outer: cond=a, then=(IF b THEN c ELSE d), else=e
		const e = auxExpr("IF a THEN IF b THEN c ELSE d ELSE e");
		expect(isIfThenElse(e)).toBe(true);
		if (isIfThenElse(e)) {
			expect(e.cond.type).toBe("IdentifierReference");
			expect(isIfThenElse(e.thenBranch)).toBe(true);
			if (isIfThenElse(e.thenBranch)) {
				expect(e.thenBranch.cond.type).toBe("IdentifierReference"); // b
				expect(e.thenBranch.thenBranch.type).toBe("IdentifierReference"); // c
				expect(e.thenBranch.elseBranch.type).toBe("IdentifierReference"); // d
			}
			expect(e.elseBranch.type).toBe("IdentifierReference"); // e
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
		const { diagnostics } = parseSource(`sfd m\naux x == 5`);
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("aux x = a == 5 — single = is assignment, == is equality", () => {
		// Should parse: x is assigned the result of (a == 5)
		const e = auxExpr("a == 5");
		expect(isBinaryExpression(e) && e.op === "=").toBe(true);
	});
});

// ── Existing rule references still work ──────────────────────────────────────

describe("integration with other rules", () => {
	test("aux x = a < b parses", () => {
		expect(() => auxExpr("a < b")).not.toThrow();
	});

	test("stock { init: a > 0 } parses", () => {
		const { ast, diagnostics } = parseSource(`sfd m\nstock s { init: a > 0 }`);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});

	test("flow { rate: IF a THEN b ELSE c } parses", () => {
		const { ast, diagnostics } = parseSource(
			`sfd m\nstock s { init: 0 }\nflow f { from: null  to: s  rate: IF a THEN b ELSE c }`,
		);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});
});
