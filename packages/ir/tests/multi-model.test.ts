import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";

import { DiagnosticCode } from "@sysdml/contracts";
import { compileAST } from "../src/compile.js";

describe("MULTI_MODEL_NOT_SUPPORTED (B1)", () => {
	test("single-model file produces no MULTI_MODEL_NOT_SUPPORTED", () => {
		const { ast } = parseSource(
			`sfd only\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`,
		);
		expect(ast).not.toBeNull();
		const { diagnostics } = compileAST(ast!);
		expect(
			diagnostics.find(
				(d) => d.code === DiagnosticCode.MULTI_MODEL_NOT_SUPPORTED,
			),
		).toBeUndefined();
	});

	test("two-model file emits one MULTI_MODEL_NOT_SUPPORTED diagnostic against the second model", () => {
		const { ast } = parseSource(
			`sfd main\nsfd sub\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`,
		);
		expect(ast).not.toBeNull();
		const { diagnostics } = compileAST(ast!);
		const multi = diagnostics.filter(
			(d) => d.code === DiagnosticCode.MULTI_MODEL_NOT_SUPPORTED,
		);
		expect(multi).toHaveLength(1);
		expect(multi[0].message).toContain("sub");
		expect(multi[0].span).toBeDefined();
		expect(multi[0].span!.start.line).toBe(2);
	});

	test("three-model file emits two MULTI_MODEL_NOT_SUPPORTED diagnostics in source order", () => {
		const { ast } = parseSource(
			`sfd main\nsfd sub_a\nsfd sub_b\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`,
		);
		expect(ast).not.toBeNull();
		const { diagnostics } = compileAST(ast!);
		const multi = diagnostics.filter(
			(d) => d.code === DiagnosticCode.MULTI_MODEL_NOT_SUPPORTED,
		);
		expect(multi).toHaveLength(2);
		expect(multi[0].message).toContain("sub_a");
		expect(multi[1].message).toContain("sub_b");
	});

	test("the entry model still compiles into the IR even when submodels are rejected", () => {
		const { ast } = parseSource(
			`sfd main\nsfd sub\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`,
		);
		expect(ast).not.toBeNull();
		const { ir } = compileAST(ast!);
		expect(ir).not.toBeNull();
		expect(ir!.model.id).toBe("main");
	});
});
