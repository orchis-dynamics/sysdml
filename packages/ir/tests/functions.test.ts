import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";

import { compileAST, DiagnosticCode } from "../src/index.js";
import type { IRExpressionNode } from "../src/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function parse(src: string) {
	const { ast, diagnostics } = parseSource(src);
	if (diagnostics.length > 0)
		throw new Error(`Parse error: ${diagnostics[0].message}`);
	return ast!;
}

/** Wrap an expression inside a minimal valid model and compile it as an aux. */
function compileExpressionSource(
	expressionSource: string,
	extraDeclarations = "",
) {
	const src = `
sfd m
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux a = 1
aux b = 1
aux c = 1
aux d = 1
${extraDeclarations}
aux result = ${expressionSource}
`;
	return compileAST(parse(src));
}

function getResultExpression(
	expressionSource: string,
	extraDeclarations = "",
): IRExpressionNode {
	const { ir, diagnostics } = compileExpressionSource(
		expressionSource,
		extraDeclarations,
	);
	expect(diagnostics).toHaveLength(0);
	expect(ir).not.toBeNull();
	// last aux is always `result`
	return ir!.auxiliaries[ir!.auxiliaries.length - 1].expr;
}

function createFunctionCallNode(
	name: string,
	...args: IRExpressionNode[]
): IRExpressionNode {
	return { type: "FunctionCall", name, args };
}

function createRefNode(id: string): IRExpressionNode {
	return { type: "Reference", id };
}

// ── Case normalisation ────────────────────────────────────────────────────────

describe("case normalisation", () => {
	test("lowercase name is uppercased in IR", () => {
		expect(getResultExpression("abs(a)")).toEqual(
			createFunctionCallNode("ABS", createRefNode("a")),
		);
	});

	test("mixed case is uppercased in IR", () => {
		expect(getResultExpression("Sin(a)")).toEqual(
			createFunctionCallNode("SIN", createRefNode("a")),
		);
	});

	test("already uppercase is unchanged", () => {
		expect(getResultExpression("ABS(a)")).toEqual(
			createFunctionCallNode("ABS", createRefNode("a")),
		);
	});
});

// ── Zero-arg with and without parens ─────────────────────────────────────────

describe("zero-arg built-ins (parens optional)", () => {
	test("TIME() compiles to FunctionCall", () => {
		expect(getResultExpression("TIME()")).toEqual(
			createFunctionCallNode("TIME"),
		);
	});

	test("TIME bare ident also compiles to FunctionCall", () => {
		expect(getResultExpression("TIME")).toEqual(createFunctionCallNode("TIME"));
	});

	test("TIME() and TIME produce identical IR", () => {
		expect(getResultExpression("TIME()")).toEqual(getResultExpression("TIME"));
	});

	test("DT bare", () => {
		expect(getResultExpression("DT")).toEqual(createFunctionCallNode("DT"));
	});

	test("STARTTIME bare", () => {
		expect(getResultExpression("STARTTIME")).toEqual(
			createFunctionCallNode("STARTTIME"),
		);
	});

	test("STOPTIME bare", () => {
		expect(getResultExpression("STOPTIME")).toEqual(
			createFunctionCallNode("STOPTIME"),
		);
	});

	test("PI bare", () => {
		expect(getResultExpression("PI")).toEqual(createFunctionCallNode("PI"));
	});

	test("INF bare", () => {
		expect(getResultExpression("INF")).toEqual(createFunctionCallNode("INF"));
	});
});

// ── Every built-in function compiles without error ────────────────────────────

describe("math functions (1-arg)", () => {
	for (const name of [
		"ABS",
		"INT",
		"SQRT",
		"EXP",
		"LN",
		"LOG10",
		"SIN",
		"COS",
		"TAN",
		"ARCSIN",
		"ARCCOS",
		"ARCTAN",
	]) {
		test(name, () => {
			const expr = getResultExpression(`${name}(a)`);
			expect(expr).toEqual(createFunctionCallNode(name, createRefNode("a")));
		});
	}
});

describe("math functions (2-arg)", () => {
	test("MIN", () => {
		expect(getResultExpression("MIN(a, b)")).toEqual(
			createFunctionCallNode("MIN", createRefNode("a"), createRefNode("b")),
		);
	});
	test("MAX", () => {
		expect(getResultExpression("MAX(a, b)")).toEqual(
			createFunctionCallNode("MAX", createRefNode("a"), createRefNode("b")),
		);
	});
});

describe("zero-arg constants", () => {
	for (const name of ["TIME", "DT", "STARTTIME", "STOPTIME", "PI", "INF"]) {
		test(`${name}()`, () => {
			expect(getResultExpression(`${name}()`)).toEqual(
				createFunctionCallNode(name),
			);
		});
	}
});

describe("misc / memory functions", () => {
	test("INIT", () => {
		expect(getResultExpression("INIT(a)")).toEqual(
			createFunctionCallNode("INIT", createRefNode("a")),
		);
	});
	test("PREVIOUS", () => {
		expect(getResultExpression("PREVIOUS(a, b)")).toEqual(
			createFunctionCallNode(
				"PREVIOUS",
				createRefNode("a"),
				createRefNode("b"),
			),
		);
	});
	test("SELF", () => {
		expect(getResultExpression("SELF()")).toEqual(
			createFunctionCallNode("SELF"),
		);
	});
});

describe("delay and smoothing functions", () => {
	test("DELAY1 (2-arg)", () => {
		expect(getResultExpression("DELAY1(a, b)")).toEqual(
			createFunctionCallNode("DELAY1", createRefNode("a"), createRefNode("b")),
		);
	});
	test("DELAY1 (3-arg with init)", () => {
		expect(getResultExpression("DELAY1(a, b, c)")).toEqual(
			createFunctionCallNode(
				"DELAY1",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
			),
		);
	});
	test("DELAY3 (2-arg)", () => {
		expect(getResultExpression("DELAY3(a, b)")).toEqual(
			createFunctionCallNode("DELAY3", createRefNode("a"), createRefNode("b")),
		);
	});
	test("DELAYN (3-arg)", () => {
		expect(getResultExpression("DELAYN(a, b, c)")).toEqual(
			createFunctionCallNode(
				"DELAYN",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
			),
		);
	});
	test("DELAYN (4-arg)", () => {
		expect(getResultExpression("DELAYN(a, b, c, d)")).toEqual(
			createFunctionCallNode(
				"DELAYN",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
				createRefNode("d"),
			),
		);
	});
	test("DELAY (2-arg)", () => {
		expect(getResultExpression("DELAY(a, b)")).toEqual(
			createFunctionCallNode("DELAY", createRefNode("a"), createRefNode("b")),
		);
	});
	test("SMTH1 (2-arg)", () => {
		expect(getResultExpression("SMTH1(a, b)")).toEqual(
			createFunctionCallNode("SMTH1", createRefNode("a"), createRefNode("b")),
		);
	});
	test("SMTH3 (2-arg)", () => {
		expect(getResultExpression("SMTH3(a, b)")).toEqual(
			createFunctionCallNode("SMTH3", createRefNode("a"), createRefNode("b")),
		);
	});
	test("SMTHN (3-arg)", () => {
		expect(getResultExpression("SMTHN(a, b, c)")).toEqual(
			createFunctionCallNode(
				"SMTHN",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
			),
		);
	});
	test("TREND (2-arg)", () => {
		expect(getResultExpression("TREND(a, b)")).toEqual(
			createFunctionCallNode("TREND", createRefNode("a"), createRefNode("b")),
		);
	});
	test("FORCST (3-arg)", () => {
		expect(getResultExpression("FORCST(a, b, c)")).toEqual(
			createFunctionCallNode(
				"FORCST",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
			),
		);
	});
});

describe("test input functions", () => {
	test("STEP", () => {
		expect(getResultExpression("STEP(a, b)")).toEqual(
			createFunctionCallNode("STEP", createRefNode("a"), createRefNode("b")),
		);
	});
	test("RAMP", () => {
		expect(getResultExpression("RAMP(a, b)")).toEqual(
			createFunctionCallNode("RAMP", createRefNode("a"), createRefNode("b")),
		);
	});
	test("PULSE (2-arg)", () => {
		expect(getResultExpression("PULSE(a, b)")).toEqual(
			createFunctionCallNode("PULSE", createRefNode("a"), createRefNode("b")),
		);
	});
	test("PULSE (3-arg with interval)", () => {
		expect(getResultExpression("PULSE(a, b, c)")).toEqual(
			createFunctionCallNode(
				"PULSE",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
			),
		);
	});
});

describe("statistical functions", () => {
	test("RANDOM (2-arg)", () => {
		expect(getResultExpression("RANDOM(a, b)")).toEqual(
			createFunctionCallNode("RANDOM", createRefNode("a"), createRefNode("b")),
		);
	});
	test("RANDOM (3-arg with seed)", () => {
		expect(getResultExpression("RANDOM(a, b, c)")).toEqual(
			createFunctionCallNode(
				"RANDOM",
				createRefNode("a"),
				createRefNode("b"),
				createRefNode("c"),
			),
		);
	});
	test("NORMAL (2-arg)", () => {
		expect(getResultExpression("NORMAL(a, b)")).toEqual(
			createFunctionCallNode("NORMAL", createRefNode("a"), createRefNode("b")),
		);
	});
	test("LOGNORMAL (2-arg)", () => {
		expect(getResultExpression("LOGNORMAL(a, b)")).toEqual(
			createFunctionCallNode(
				"LOGNORMAL",
				createRefNode("a"),
				createRefNode("b"),
			),
		);
	});
	test("EXPRND (1-arg)", () => {
		expect(getResultExpression("EXPRND(a)")).toEqual(
			createFunctionCallNode("EXPRND", createRefNode("a")),
		);
	});
	test("EXPRND (2-arg with seed)", () => {
		expect(getResultExpression("EXPRND(a, b)")).toEqual(
			createFunctionCallNode("EXPRND", createRefNode("a"), createRefNode("b")),
		);
	});
	test("POISSON (1-arg)", () => {
		expect(getResultExpression("POISSON(a)")).toEqual(
			createFunctionCallNode("POISSON", createRefNode("a")),
		);
	});
});

// ── Error cases ───────────────────────────────────────────────────────────────

describe("error cases", () => {
	test("unknown function → UNKNOWN_FUNCTION", () => {
		const { ir, diagnostics } = compileExpressionSource("unknown_fn(a)");
		expect(ir).toBeNull();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe(DiagnosticCode.UNKNOWN_FUNCTION);
		expect(diagnostics[0].message).toContain("unknown_fn");
	});

	test("too few args: ABS() → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource("ABS()");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
		expect(diagnostics[0].message).toContain("ABS");
		expect(diagnostics[0].message).toContain("0");
	});

	test("too many args: ABS(a, b) → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource("ABS(a, b)");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
	});

	test("too few args: MIN(a) → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource("MIN(a)");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
	});

	test("too few args: DELAY1(a) → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource("DELAY1(a)");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
	});

	test("too many args: DELAY1(a, b, c, d) → WRONG_ARITY", () => {
		const { ir, diagnostics } = compileExpressionSource("DELAY1(a, b, c, d)");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.WRONG_ARITY);
	});

	test("multiple unknown functions → all collected, ir null", () => {
		const { ir, diagnostics } = compileExpressionSource("foo(a) + bar(b)");
		expect(ir).toBeNull();
		expect(diagnostics).toHaveLength(2);
		expect(
			diagnostics.every(
				(diagnostic) => diagnostic.code === DiagnosticCode.UNKNOWN_FUNCTION,
			),
		).toBe(true);
	});

	test("undefined arg inside known function → UNDEFINED_IDENTIFIER not UNKNOWN_FUNCTION", () => {
		const { ir, diagnostics } = compileExpressionSource("ABS(ghost_var)");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.UNDEFINED_IDENTIFIER);
	});

	test("existing tests: undefined identifier still has UNDEFINED_IDENTIFIER code", () => {
		const { ir, diagnostics } = compileExpressionSource("ghost_var");
		expect(ir).toBeNull();
		expect(diagnostics[0].code).toBe(DiagnosticCode.UNDEFINED_IDENTIFIER);
		expect(diagnostics[0].message).toContain("ghost_var");
	});
});
