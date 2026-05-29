import { describe, test, expect } from "vitest";

import { parseSource } from "@sysdml/parser";

import { compileAST } from "../src/compile.js";
import { DiagnosticCode } from "../src/diagnostics.js";

const ONE_STOCK = `stock s { init: 0 }`;

function compile(src: string) {
	const { ast, diagnostics: parseDiagnostics } = parseSource(src);
	return { ast, parseDiagnostics };
}

describe("time block validation — XMILE §2.3 mappings (B6.4)", () => {
	test("missing time block → MISSING_TIME_BLOCK", () => {
		const { ast, parseDiagnostics } = compile(
			`sfd m\n${ONE_STOCK}`,
		);
		expect(parseDiagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.MISSING_TIME_BLOCK),
		).toBeDefined();
	});

	test("two time blocks → DUPLICATE_TIME_BLOCK on the second", () => {
		const { ast, parseDiagnostics } = compile(
			`sfd m\ntime { start: 0 end: 10 step: 1 }\ntime { start: 0 end: 10 step: 1 }\n${ONE_STOCK}`,
		);
		expect(parseDiagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).toBeNull();
		const duplicate = diagnostics.find(
			(d) => d.code === DiagnosticCode.DUPLICATE_TIME_BLOCK,
		);
		expect(duplicate).toBeDefined();
		expect(duplicate!.span).toBeDefined();
		// The diagnostic points at the SECOND time block (line 3 here).
		expect(duplicate!.span!.start.line).toBe(3);
	});

	test("step = 0 → INVALID_TIME_STEP", () => {
		const { ast } = compile(
			`sfd m\ntime { start: 0 end: 10 step: 0 }\n${ONE_STOCK}`,
		);
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.INVALID_TIME_STEP),
		).toBeDefined();
	});

	test("negative literals are not expressible in time block (parse error)", () => {
		// `time_prop := 'step' ':' number` and `number := INT | DECIMAL` — no
		// unary minus in the number grammar at this position. So `step: -1` is
		// caught at parse time, not via INVALID_TIME_STEP.
		const { ast, parseDiagnostics } = compile(
			`sfd m\ntime { start: 0 end: 10 step: -1 }\n${ONE_STOCK}`,
		);
		expect(ast).toBeNull();
		expect(parseDiagnostics.length).toBeGreaterThan(0);
	});

	test("end < start → INVALID_TIME_RANGE", () => {
		const { ast } = compile(
			`sfd m\ntime { start: 10 end: 0 step: 1 }\n${ONE_STOCK}`,
		);
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.INVALID_TIME_RANGE),
		).toBeDefined();
	});

	test("end == start is accepted (zero-step run)", () => {
		const { ast } = compile(
			`sfd m\ntime { start: 5 end: 5 step: 1 }\n${ONE_STOCK}`,
		);
		const { ir, diagnostics } = compileAST(ast!);
		expect(ir).not.toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.INVALID_TIME_RANGE),
		).toBeUndefined();
	});

	test("non-numeric start is a parse error", () => {
		const { ast, parseDiagnostics } = compile(
			`sfd m\ntime { start: foo end: 10 step: 1 }\n${ONE_STOCK}`,
		);
		expect(ast).toBeNull();
		expect(parseDiagnostics.length).toBeGreaterThan(0);
	});

	test("non-numeric end is a parse error", () => {
		const { ast, parseDiagnostics } = compile(
			`sfd m\ntime { start: 0 end: bar step: 1 }\n${ONE_STOCK}`,
		);
		expect(ast).toBeNull();
		expect(parseDiagnostics.length).toBeGreaterThan(0);
	});

	test("non-numeric step is a parse error", () => {
		const { ast, parseDiagnostics } = compile(
			`sfd m\ntime { start: 0 end: 10 step: baz }\n${ONE_STOCK}`,
		);
		expect(ast).toBeNull();
		expect(parseDiagnostics.length).toBeGreaterThan(0);
	});

	test("missing time property (no step) is a parse error", () => {
		const { ast, parseDiagnostics } = compile(
			`sfd m\ntime { start: 0 end: 10 }\n${ONE_STOCK}`,
		);
		// Grammar requires at least one prop; current parser accepts a `time {}`
		// with any subset of props and the IR validates required-ness. So this
		// case actually currently parses but fails at IR. Allow either layer.
		if (ast === null) {
			expect(parseDiagnostics.length).toBeGreaterThan(0);
			return;
		}
		const { ir } = compileAST(ast);
		expect(ir).toBeNull();
	});
});
