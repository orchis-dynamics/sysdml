import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";

import { DiagnosticCode } from "@sysdml/contracts";
import { compileAST } from "../src/compile.js";

const TIME_BLOCK = `time { start: 0 end: 10 step: 1 }`;

function expectDuplicate(src: string, id: string) {
	const { ast, diagnostics: parseDiagnostics } = parseSource(src);
	expect(
		parseDiagnostics,
		`parser unexpectedly failed for src: ${src}`,
	).toHaveLength(0);
	expect(ast).not.toBeNull();
	const { ir, diagnostics } = compileAST(ast!);
	expect(ir, `expected null IR for duplicate-id src: ${src}`).toBeNull();
	const duplicates = diagnostics.filter(
		(d) => d.code === DiagnosticCode.DUPLICATE_IDENTIFIER,
	);
	expect(
		duplicates.length,
		`expected DUPLICATE_IDENTIFIER for '${id}'`,
	).toBeGreaterThan(0);
	expect(duplicates[0].message).toContain(`'${id}'`);
	expect(duplicates[0].span).toBeDefined();
}

describe("DUPLICATE_IDENTIFIER coverage matrix (B11)", () => {
	// ── same-type collisions ──────────────────────────────────────────────────

	test("stock × stock: two stocks with the same id", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nstock s { init: 1 }`,
			"s",
		);
	});

	test("flow × flow: two flows with the same id", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nflow f { from: null to: s rate: 1 }\nflow f { from: s to: null rate: 1 }`,
			"f",
		);
	});

	test("aux × aux: two aux with the same id", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\naux x = 1\naux x = 2`,
			"x",
		);
	});

	// ── cross-type collisions ─────────────────────────────────────────────────

	test("stock × aux: stock and aux share an id", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock x { init: 0 }\naux x = 1`,
			"x",
		);
	});

	test("aux × stock: declaration order reversed", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\naux x = 1\nstock x { init: 0 }`,
			"x",
		);
	});

	test("stock × flow: stock and flow share an id", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock x { init: 0 }\nflow x { from: null to: x rate: 1 }`,
			"x",
		);
	});

	test("flow × stock: declaration order reversed", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nflow x { from: null to: s rate: 1 }\nstock x { init: 0 }`,
			"x",
		);
	});

	test("aux × flow: aux and flow share an id", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\naux x = 1\nflow x { from: null to: s rate: 1 }`,
			"x",
		);
	});

	test("flow × aux: declaration order reversed", () => {
		expectDuplicate(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nflow x { from: null to: s rate: 1 }\naux x = 1`,
			"x",
		);
	});
});

describe("variable identifier required (B11)", () => {
	test("stock without identifier is a parse error", () => {
		const { ast, diagnostics } = parseSource(
			`sfd m\n${TIME_BLOCK}\nstock { init: 0 }`,
		);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("flow without identifier is a parse error", () => {
		const { ast, diagnostics } = parseSource(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nflow { from: null to: s rate: 1 }`,
		);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("aux without identifier is a parse error", () => {
		const { ast, diagnostics } = parseSource(`sfd m\n${TIME_BLOCK}\naux = 1`);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});
});

describe("variable equation required (B11)", () => {
	test("stock without init is a parse error", () => {
		const { ast, diagnostics } = parseSource(
			`sfd m\n${TIME_BLOCK}\nstock s { }`,
		);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	// Flow's `flowProp+` is satisfied by any ≥1 flowProp, so missing `rate:` is
	// enforced one layer later than missing `init:` (stock) or missing `expr` (aux).
	test("flow without rate is rejected by the IR with MISSING_FLOW_PROPERTY", () => {
		const { ast, diagnostics: parseDiagnostics } = parseSource(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nflow f { from: null to: s }`,
		);
		expect(parseDiagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).toBeNull();
		const missing = diagnostics.filter(
			(d) => d.code === DiagnosticCode.MISSING_FLOW_PROPERTY,
		);
		expect(missing.length).toBeGreaterThan(0);
		expect(missing[0].message).toMatch(/'?rate'?/i);
		expect(missing[0].message).toContain("'f'");
	});

	test("aux without expression is a parse error", () => {
		const { ast, diagnostics } = parseSource(`sfd m\n${TIME_BLOCK}\naux x =`);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});
});

function expectShadowsBuiltin(src: string, id: string) {
	const { ast, diagnostics: parseDiagnostics } = parseSource(src);
	expect(
		parseDiagnostics,
		`parser unexpectedly failed for src: ${src}`,
	).toHaveLength(0);
	expect(ast).not.toBeNull();
	const { ir, diagnostics } = compileAST(ast!);
	expect(ir, `expected null IR for shadow-builtin src: ${src}`).toBeNull();
	const shadows = diagnostics.filter(
		(d) => d.code === DiagnosticCode.IDENTIFIER_SHADOWS_BUILTIN,
	);
	expect(
		shadows.length,
		`expected IDENTIFIER_SHADOWS_BUILTIN for '${id}'`,
	).toBeGreaterThan(0);
	expect(shadows[0].message).toContain(`'${id}'`);
	expect(shadows[0].message).toContain(id.toUpperCase());
	expect(shadows[0].span).toBeDefined();
}

describe("IDENTIFIER_SHADOWS_BUILTIN (B4.1)", () => {
	test("stock id matching a builtin function name (uppercase) is rejected", () => {
		expectShadowsBuiltin(`sfd m\n${TIME_BLOCK}\nstock MIN { init: 0 }`, "MIN");
	});

	test("aux id matching a builtin function name (lowercase) is rejected — comparison is case-insensitive", () => {
		expectShadowsBuiltin(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\naux abs = 1`,
			"abs",
		);
	});

	test("flow id matching a builtin function name (mixed case) is rejected", () => {
		expectShadowsBuiltin(
			`sfd m\n${TIME_BLOCK}\nstock s { init: 0 }\nflow Time { from: null to: s rate: 1 }`,
			"Time",
		);
	});

	test("a zero-arg builtin name (e.g. TIME, DT) is also shadowed", () => {
		expectShadowsBuiltin(`sfd m\n${TIME_BLOCK}\nstock DT { init: 0 }`, "DT");
	});

	test("non-builtin identifiers are accepted (sanity)", () => {
		const { ast } = parseSource(
			`sfd m\n${TIME_BLOCK}\nstock population { init: 100 }\naux birth_rate = 0.02`,
		);
		expect(ast).not.toBeNull();
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).not.toBeNull();
		expect(
			diagnostics.find(
				(d) => d.code === DiagnosticCode.IDENTIFIER_SHADOWS_BUILTIN,
			),
		).toBeUndefined();
	});
});
