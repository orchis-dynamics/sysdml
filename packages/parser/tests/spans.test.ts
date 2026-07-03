import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	BinaryExpressionNode,
	FunctionCallNode,
} from "../src/index.js";

// Span contract: line and col are both 1-based, end-inclusive.
// These tests pin that contract against literal source positions a human
// can count, so any drift between the README and the implementation breaks.

describe("spans — 1-based, end-inclusive", () => {
	// ── tokens via tokenSpan (idSpan, nameSpan) ──────────────────────────────

	test("multi-char identifier idSpan", () => {
		//  s  f  d     a  b  c
		//  1  2  3  4  5  6  7
		const { ast } = parseSource(`sfd abc`);
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.model.idSpan).toEqual({
			start: { line: 1, col: 5 },
			end: { line: 1, col: 7 },
		});
	});

	test("single-char identifier idSpan", () => {
		//  s  f  d     m
		//  1  2  3  4  5
		const { ast } = parseSource(`sfd m`);
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.model.idSpan).toEqual({
			start: { line: 1, col: 5 },
			end: { line: 1, col: 5 },
		});
	});

	test("function call nameSpan covers only the name token", () => {
		// line 2: a  u  x     x     =     S  Q  R  T  (  1  )
		//         1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
		const { ast } = parseSource(`sfd m\naux x = SQRT(1)`);
		if (ast === null) throw new Error("expected non-null ast");
		const aux = ast.decls[0];
		if (
			aux?.type !== "AuxiliaryDeclaration" ||
			aux.expr?.type !== "FunctionCall"
		) {
			throw new Error("expected AuxiliaryDeclaration with FunctionCall expr");
		}
		const call: FunctionCallNode = aux.expr;
		expect(call.nameSpan).toEqual({
			start: { line: 2, col: 9 },
			end: { line: 2, col: 12 },
		});
		// full call span extends past the closing paren
		expect(call.span.end.col).toBe(15);
	});

	// ── rule contexts via spanOf ─────────────────────────────────────────────

	test("sfd decl span covers entire declaration", () => {
		//  s  f  d     d  e  m  o
		//  1  2  3  4  5  6  7  8
		const { ast } = parseSource(`sfd demo`);
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.model.span).toEqual({
			start: { line: 1, col: 1 },
			end: { line: 1, col: 8 },
		});
	});

	test("binary expression and operand subspans", () => {
		// line 2: a  u  x     x     =     1  0     +     2  0
		//         1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
		const { ast } = parseSource(`sfd m\naux x = 10 + 20`);
		if (ast === null) throw new Error("expected non-null ast");
		const aux = ast.decls[0];
		if (
			aux?.type !== "AuxiliaryDeclaration" ||
			aux.expr?.type !== "BinaryExpression"
		) {
			throw new Error("expected AuxiliaryDeclaration with BinaryExpression");
		}
		const expr: BinaryExpressionNode = aux.expr;
		// 10 + 20 — full span from first digit of 10 to last digit of 20
		expect(expr.span).toEqual({
			start: { line: 2, col: 9 },
			end: { line: 2, col: 15 },
		});
		if (
			expr.left.type !== "NumberLiteral" ||
			expr.right.type !== "NumberLiteral"
		) {
			throw new Error("expected NumberLiteral operands");
		}
		expect(expr.left.span).toEqual({
			start: { line: 2, col: 9 },
			end: { line: 2, col: 10 },
		});
		expect(expr.right.span).toEqual({
			start: { line: 2, col: 14 },
			end: { line: 2, col: 15 },
		});
	});

	// ── multi-line ───────────────────────────────────────────────────────────

	test("line numbers increment across blank lines", () => {
		// line 1: sfd m
		// line 2: (blank)
		// line 3: aux x = 1
		const { ast } = parseSource(`sfd m\n\naux x = 1`);
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.model.span.start.line).toBe(1);
		const aux = ast.decls[0];
		if (aux?.type !== "AuxiliaryDeclaration")
			throw new Error("expected AuxiliaryDeclaration");
		expect(aux.idSpan.start.line).toBe(3);
		expect(aux.idSpan.start.col).toBe(5);
		expect(aux.idSpan.end.col).toBe(5);
	});

	test("file span ends at the last real column, not past EOF", () => {
		// line 2: a  u  x     x     =     1
		//         1  2  3  4  5  6  7  8  9
		const { ast } = parseSource(`sfd m\naux x = 1`);
		if (ast === null) throw new Error("expected non-null ast");
		expect(ast.span).toEqual({
			start: { line: 1, col: 1 },
			end: { line: 2, col: 9 },
		});
	});

	// ── diagnostics ──────────────────────────────────────────────────────────

	test("lexer diagnostic for unknown character has 1-based col", () => {
		// line 2: a  u  x     x     =     @
		//         1  2  3  4  5  6  7  8  9
		const { ast, diagnostics } = parseSource(`sfd m\naux x = @`);
		expect(ast).toBeNull();
		const lexErr = diagnostics.find((d) => d.message.includes("@"));
		if (lexErr === undefined)
			throw new Error("expected lexer diagnostic for '@'");
		expect(lexErr.span.start).toEqual({ line: 2, col: 9 });
	});

	test("parser diagnostic on EOF after 'sfd' points past the keyword", () => {
		//  s  f  d    <EOF>
		//  1  2  3    4
		const { ast, diagnostics } = parseSource(`sfd`);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
		const first = diagnostics[0];
		if (first === undefined)
			throw new Error("expected at least one diagnostic");
		expect(first.span.start.line).toBe(1);
		// EOF sits at col 4 (1-based, just past the last 'd').
		expect(first.span.start.col).toBe(4);
	});

	test("parser diagnostic on a multi-char token covers its full width", () => {
		//  s  f  d     1  2  3
		//  1  2  3  4  5  6  7
		const { ast, diagnostics } = parseSource(`sfd 123`);
		expect(ast).toBeNull();
		const first = diagnostics[0];
		if (first === undefined) throw new Error("expected at least one diagnostic");
		expect(first.span.start).toEqual({ line: 1, col: 5 });
		expect(first.span.end.col).toBeGreaterThan(first.span.start.col);
		expect(first.span.end).toEqual({ line: 1, col: 7 });
	});

	test("aux with metadata block — decl span covers the whole declaration", () => {
		// line 2: a  u  x     x     =     1     {     p  o  s  i  t  i  o  n  :     {     x  :     1  ,     y  :     2     }     }
		//         1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38
		const { ast } = parseSource(
			`sfd m\naux x = 1 { position: { x: 1, y: 2 } }`,
		);
		if (ast === null) throw new Error("expected non-null ast");
		const aux = ast.decls[0];
		if (aux?.type !== "AuxiliaryDeclaration")
			throw new Error("expected AuxiliaryDeclaration");
		expect(aux.span.start.line).toBe(2);
		expect(aux.span.start.col).toBe(1);
		expect(aux.span.end.line).toBe(2);
		expect(aux.span.end.col).toBe(38);
		expect(aux.position).toBeDefined();
	});
});
