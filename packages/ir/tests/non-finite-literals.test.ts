import { DiagnosticCode } from "@sysdml/contracts";
import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";

import { compileAST } from "../src/compile.js";

const OVERFLOW = "9".repeat(400);
const TIME = `time { start: 0 end: 10 step: 1 }`;

function compileModel(body: string) {
	const { ast, diagnostics: parseDiagnostics } = parseSource(
		`sfd m\n${TIME}\n${body}`,
	);
	expect(parseDiagnostics).toHaveLength(0);
	expect(ast).not.toBeNull();
	return compileAST(ast!);
}

describe("non-finite expression literals (B6.7)", () => {
	test("overflowing stock init → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(`stock s { init: ${OVERFLOW} }`);
		expect(ir).toBeNull();
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.NON_FINITE_LITERAL,
		);
		expect(diag).toBeDefined();
		expect(diag!.message).toBe(
			"Numeric literal must be a finite number (got Infinity)",
		);
		expect(diag!.span).toBeDefined();
		expect(diag!.span!.start.line).toBe(3);
		expect(diag!.span!.start.col).toBe("stock s { init: ".length + 1);
	});

	test("overflowing aux expression → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\naux a = ${OVERFLOW}`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});

	test("overflowing negated literal → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\naux a = -${OVERFLOW}`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});

	test("overflowing literal nested in a flow rate → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\nflow f { from: null to: s rate: 2 * ${OVERFLOW} }`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});

	test("finite literals compile clean", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0.5 }\naux a = 1000000`,
		);
		expect(diagnostics).toHaveLength(0);
		expect(ir).not.toBeNull();
	});
});

describe("non-finite LOOKUP y-points (B6.7)", () => {
	test("overflowing LOOKUP y-point → NON_FINITE_LITERAL, no synthetic gf", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\naux a = LOOKUP(0.5, 0, ${OVERFLOW})`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});

	test("negated overflowing LOOKUP y-point → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\naux a = LOOKUP(0.5, 0, -${OVERFLOW})`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});
});

describe("non-finite graphical function points (B6.7)", () => {
	test("overflowing gf ypts value → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\ngf g { kind: linear xscale: [0, 10] ypts: [0, ${OVERFLOW}] }\naux a = g(5)`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});

	test("overflowing gf xscale value → NON_FINITE_LITERAL", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\ngf g { kind: linear xscale: [0, ${OVERFLOW}] ypts: [0, 1] }\naux a = g(5)`,
		);
		expect(ir).toBeNull();
		expect(
			diagnostics.find((d) => d.code === DiagnosticCode.NON_FINITE_LITERAL),
		).toBeDefined();
	});

	test("negative overflowing gf ypts value reports -Infinity", () => {
		const { ir, diagnostics } = compileModel(
			`stock s { init: 0 }\ngf g { kind: linear xscale: [0, 10] ypts: [-${OVERFLOW}, 1] }\naux a = g(5)`,
		);
		expect(ir).toBeNull();
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.NON_FINITE_LITERAL,
		);
		expect(diag).toBeDefined();
		expect(diag!.message).toBe(
			"Numeric literal must be a finite number (got -Infinity)",
		);
	});
});
