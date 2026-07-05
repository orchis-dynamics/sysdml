import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";

import { DiagnosticCode } from "@sysdml/contracts";
import type { IR, IRGraphicalFunction } from "@sysdml/contracts";
import { compileAST } from "../src/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parse(src: string) {
	const { ast, diagnostics } = parseSource(src);
	if (diagnostics.length > 0)
		throw new Error(`Parse error: ${diagnostics[0].message}`);
	return ast!;
}

function wrap(body: string): string {
	return `
sfd m
time { start: 0 end: 10 step: 1 }
stock s { init: 100 }
${body}
`.trim();
}

function compile(body: string) {
	return compileAST(parse(wrap(body)));
}

function compileValid(body: string): IR {
	const { ir, diagnostics } = compile(body);
	expect(
		diagnostics,
		diagnostics
			.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
			.join("\n"),
	).toHaveLength(0);
	expect(ir).not.toBeNull();
	return ir!;
}

function getGraphicalFunction(ir: IR, id: string): IRGraphicalFunction {
	const found = ir.graphicalFunctions.find(
		(graphicalFunction) => graphicalFunction.id === id,
	);
	expect(found, `No GF with id '${id}' in IR`).toBeDefined();
	return found!;
}

// ── Named GF — valid declarations ─────────────────────────────────────────────

describe("named GF — xscale form", () => {
	test("produces IRGraphicalFunction in graphicalFunctions array", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }");
		expect(ir.graphicalFunctions).toHaveLength(1);
	});

	test("id matches declaration name", () => {
		const ir = compileValid(
			"gf food_curve { xscale: [0, 1] ypts: [0, 0.5, 1] }",
		);
		expect(getGraphicalFunction(ir, "food_curve").id).toBe("food_curve");
	});

	test("xscale stored as tuple", () => {
		const ir = compileValid("gf f { xscale: [0, 100] ypts: [0, 0.5, 1] }");
		expect(getGraphicalFunction(ir, "f").xscale).toEqual([0, 100]);
	});

	test("xpts is null when xscale used", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }");
		expect(getGraphicalFunction(ir, "f").xpts).toBeNull();
	});

	test("ypts stored correctly", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [0, 0.3, 0.7, 1] }");
		expect(getGraphicalFunction(ir, "f").ypts).toEqual([0, 0.3, 0.7, 1]);
	});

	test("negative xscale values", () => {
		const ir = compileValid("gf f { xscale: [-50, 50] ypts: [0, 0.5, 1] }");
		expect(getGraphicalFunction(ir, "f").xscale).toEqual([-50, 50]);
	});

	test("negative ypts values", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [-1, 0, 1] }");
		expect(getGraphicalFunction(ir, "f").ypts).toEqual([-1, 0, 1]);
	});
});

describe("named GF — xpts form", () => {
	test("xpts stored as array", () => {
		const ir = compileValid(
			"gf f { xpts: [0, 0.25, 0.5, 0.75, 1] ypts: [0, 0.1, 0.5, 0.9, 1] }",
		);
		expect(getGraphicalFunction(ir, "f").xpts).toEqual([0, 0.25, 0.5, 0.75, 1]);
	});

	test("xscale is null when xpts used", () => {
		const ir = compileValid("gf f { xpts: [0, 0.5, 1] ypts: [0, 0.5, 1] }");
		expect(getGraphicalFunction(ir, "f").xscale).toBeNull();
	});
});

describe("named GF — kind", () => {
	test("default kind is linear", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [0, 1] }");
		expect(getGraphicalFunction(ir, "f").kind).toBe("linear");
	});

	test("kind: linear stored", () => {
		const ir = compileValid(
			"gf f { kind: linear xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(getGraphicalFunction(ir, "f").kind).toBe("linear");
	});

	test("kind: extra stored", () => {
		const ir = compileValid("gf f { kind: extra xscale: [0, 1] ypts: [0, 1] }");
		expect(getGraphicalFunction(ir, "f").kind).toBe("extra");
	});

	test("kind: step with matching last two ypts", () => {
		const ir = compileValid(
			"gf f { kind: step xscale: [0, 1] ypts: [0, 0.5, 1, 1] }",
		);
		expect(getGraphicalFunction(ir, "f").kind).toBe("step");
	});
});

describe("named GF — yscale", () => {
	test("yscale stored as tuple when present", () => {
		const ir = compileValid(
			"gf f { xscale: [0, 1] ypts: [0, 0.5, 1] yscale: [0, 1] }",
		);
		expect(getGraphicalFunction(ir, "f").yscale).toEqual([0, 1]);
	});

	test("yscale is null when omitted", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }");
		expect(getGraphicalFunction(ir, "f").yscale).toBeNull();
	});
});

describe("multiple named GFs", () => {
	test("two GFs produce two entries", () => {
		const ir = compileValid(`
      gf f1 { xscale: [0, 1] ypts: [0, 1] }
      gf f2 { xscale: [0, 10] ypts: [0, 0.5, 1] }
    `);
		expect(ir.graphicalFunctions).toHaveLength(2);
	});

	test("both GFs have correct ids", () => {
		const ir = compileValid(`
      gf curve_a { xscale: [0, 1] ypts: [0, 1] }
      gf curve_b { xscale: [0, 1] ypts: [1, 0] }
    `);
		expect(getGraphicalFunction(ir, "curve_a")).toBeDefined();
		expect(getGraphicalFunction(ir, "curve_b")).toBeDefined();
	});
});

// ── Named GF called in expressions ───────────────────────────────────────────

describe("named GF call in expression", () => {
	test("produces GFCall IR node in aux", () => {
		const ir = compileValid(`
      gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }
      aux result = f(s)
    `);
		const auxExpr = ir.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "result",
		)!.expr!;
		expect(auxExpr.type).toBe("GraphicalFunctionCall");
	});

	test("GFCall name matches GF declaration id", () => {
		const ir = compileValid(`
      gf food_curve { xscale: [0, 1] ypts: [0, 0.5, 1] }
      aux result = food_curve(s)
    `);
		const auxExpr = ir.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "result",
		)!.expr!;
		if (auxExpr.type === "GraphicalFunctionCall") {
			expect(auxExpr.name).toBe("food_curve");
		}
	});

	test("GFCall arg is the compiled input expression", () => {
		const ir = compileValid(`
      gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }
      aux result = f(s)
    `);
		const auxExpr = ir.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "result",
		)!.expr!;
		if (auxExpr.type === "GraphicalFunctionCall") {
			expect(auxExpr.argument).toEqual({ type: "Reference", id: "s" });
		}
	});

	test("GFCall in flow rate", () => {
		const ir = compileValid(`
      gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }
      flow growth { from: null to: s rate: f(s) }
    `);
		expect(ir.flows[0].rate.type).toBe("GraphicalFunctionCall");
	});

	test("named GF does not appear as FunctionCall", () => {
		const ir = compileValid(`
      gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }
      aux result = f(s)
    `);
		const auxExpr = ir.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "result",
		)!.expr!;
		expect(auxExpr.type).not.toBe("FunctionCall");
	});
});

// ── Aux referencing named GF ──────────────────────────────────────────────────

describe("aux referencing named GF", () => {
	test("produces GFCall in aux expr", () => {
		const ir = compileValid(`
      gf effect_curve { xscale: [0, 1] ypts: [0, 0.5, 1] }
      aux effect = effect_curve(s)
    `);
		const auxExpr = ir.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "effect",
		)!.expr!;
		expect(auxExpr.type).toBe("GraphicalFunctionCall");
	});

	test("GFCall arg is compiled input expr", () => {
		const ir = compileValid(`
      gf effect_curve { xscale: [0, 100] ypts: [0, 0.5, 1] }
      aux effect = effect_curve(s)
    `);
		const auxExpr = ir.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "effect",
		)!.expr!;
		if (auxExpr.type === "GraphicalFunctionCall") {
			expect(auxExpr.argument).toEqual({ type: "Reference", id: "s" });
		}
	});

	test("named GF kind stored correctly", () => {
		const ir = compileValid(`
      gf effect_curve { kind: step xscale: [0, 1] ypts: [0, 1, 1] }
      aux effect = effect_curve(s)
    `);
		const namedGraphicalFunction = ir.graphicalFunctions.find(
			(graphicalFunction) => graphicalFunction.id === "effect_curve",
		);
		expect(namedGraphicalFunction!.kind).toBe("step");
	});
});

// ── lookup() inline function ──────────────────────────────────────────────────

describe("lookup() inline function", () => {
	test("produces GFCall IR node", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.5, 1)");
		expect(ir.auxiliaries[0].expr!.type).toBe("GraphicalFunctionCall");
	});

	test("produces synthetic GF in graphicalFunctions", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.5, 1)");
		expect(ir.graphicalFunctions).toHaveLength(1);
		expect(ir.graphicalFunctions[0].id).toBe("__lookup_0");
	});

	test("synthetic GF has kind linear", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.5, 1)");
		expect(ir.graphicalFunctions[0].kind).toBe("linear");
	});

	test("synthetic GF has xscale [0, 1]", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.5, 1)");
		expect(ir.graphicalFunctions[0].xscale).toEqual([0, 1]);
	});

	test("synthetic GF ypts match args", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.3, 0.7, 1)");
		expect(ir.graphicalFunctions[0].ypts).toEqual([0, 0.3, 0.7, 1]);
	});

	test("GFCall name references the synthetic GF id", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.5, 1)");
		if (ir.auxiliaries[0].expr!.type === "GraphicalFunctionCall") {
			expect(ir.auxiliaries[0].expr!.name).toBe("__lookup_0");
		}
	});

	test("GFCall arg is compiled input expression", () => {
		const ir = compileValid("aux result = lookup(s, 0, 0.5, 1)");
		if (ir.auxiliaries[0].expr!.type === "GraphicalFunctionCall") {
			expect(ir.auxiliaries[0].expr!.argument).toEqual({
				type: "Reference",
				id: "s",
			});
		}
	});

	test("multiple lookup calls get incrementing synthetic ids", () => {
		const ir = compileValid(`
      aux r1 = lookup(s, 0, 0.5, 1)
      aux r2 = lookup(s, 0, 0.2, 0.8, 1)
    `);
		expect(ir.graphicalFunctions[0].id).toBe("__lookup_0");
		expect(ir.graphicalFunctions[1].id).toBe("__lookup_1");
	});

	test("two ypts minimum works", () => {
		const ir = compileValid("aux result = lookup(s, 0, 1)");
		expect(ir.graphicalFunctions[0].ypts).toEqual([0, 1]);
	});

	test("lookup in flow rate", () => {
		const ir = compileValid(`
      flow growth { from: null to: s rate: lookup(s, 0, 0.5, 1) }
    `);
		expect(ir.flows[0].rate.type).toBe("GraphicalFunctionCall");
	});

	test("negative ypts in lookup", () => {
		const ir = compileValid("aux result = lookup(s, -1, 0, 1)");
		expect(ir.graphicalFunctions[0].ypts).toEqual([-1, 0, 1]);
	});
});

// ── Validation errors ─────────────────────────────────────────────────────────

describe("MISSING_X_DEFINITION", () => {
	test("GF with neither xscale nor xpts emits MISSING_X_DEFINITION", () => {
		const { diagnostics } = compile("gf f { ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.MISSING_X_DEFINITION,
			),
		).toBe(true);
	});
});

describe("XSCALE_WRONG_COUNT", () => {
	test("xscale with 1 element emits XSCALE_WRONG_COUNT", () => {
		const { diagnostics } = compile("gf f { xscale: [1] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XSCALE_WRONG_COUNT,
			),
		).toBe(true);
	});

	test("xscale with 3 elements emits XSCALE_WRONG_COUNT", () => {
		const { diagnostics } = compile(
			"gf f { xscale: [0, 0.5, 1] ypts: [0, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XSCALE_WRONG_COUNT,
			),
		).toBe(true);
	});

	test("xscale empty [] emits XSCALE_WRONG_COUNT", () => {
		const { diagnostics } = compile("gf f { xscale: [] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XSCALE_WRONG_COUNT,
			),
		).toBe(true);
	});
});

describe("XSCALE_NOT_ASCENDING", () => {
	test("descending xscale emits XSCALE_NOT_ASCENDING", () => {
		const { diagnostics } = compile("gf f { xscale: [1, 0] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XSCALE_NOT_ASCENDING,
			),
		).toBe(true);
	});

	test("equal xscale bounds emit XSCALE_NOT_ASCENDING", () => {
		const { diagnostics } = compile("gf f { xscale: [0, 0] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XSCALE_NOT_ASCENDING,
			),
		).toBe(true);
	});

	test("ascending xscale does not emit XSCALE_NOT_ASCENDING", () => {
		const { diagnostics } = compile("gf f { xscale: [0, 1] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XSCALE_NOT_ASCENDING,
			),
		).toBe(false);
	});
});

describe("YPTS_TOO_FEW", () => {
	test("empty ypts emits YPTS_TOO_FEW", () => {
		const { diagnostics } = compile("gf f { xscale: [0, 1] ypts: [] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.YPTS_TOO_FEW,
			),
		).toBe(true);
	});

	test("single-point ypts emits YPTS_TOO_FEW", () => {
		const { diagnostics } = compile("gf f { xscale: [0, 1] ypts: [5] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.YPTS_TOO_FEW,
			),
		).toBe(true);
	});

	test("two-point ypts compiles clean", () => {
		const ir = compileValid("gf f { xscale: [0, 1] ypts: [0, 1] }");
		expect(getGraphicalFunction(ir, "f").ypts).toEqual([0, 1]);
	});
});

describe("YSCALE_WRONG_COUNT", () => {
	test("yscale with 1 element emits YSCALE_WRONG_COUNT", () => {
		const { diagnostics } = compile(
			"gf f { xscale: [0, 1] ypts: [0, 1] yscale: [0] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.YSCALE_WRONG_COUNT,
			),
		).toBe(true);
	});

	test("yscale with 3 elements emits YSCALE_WRONG_COUNT", () => {
		const { diagnostics } = compile(
			"gf f { xscale: [0, 1] ypts: [0, 1] yscale: [0, 0.5, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.YSCALE_WRONG_COUNT,
			),
		).toBe(true);
	});

	test("yscale with 2 elements does not emit YSCALE_WRONG_COUNT", () => {
		const ir = compileValid(
			"gf f { xscale: [0, 1] ypts: [0, 1] yscale: [0, 1] }",
		);
		expect(getGraphicalFunction(ir, "f").yscale).toEqual([0, 1]);
	});
});

describe("RESERVED_IDENTIFIER", () => {
	test("gf with __lookup_ prefix emits RESERVED_IDENTIFIER", () => {
		const { diagnostics } = compile(
			"gf __lookup_0 { xscale: [0, 1] ypts: [0, 1] }",
		);
		const diagnostic = diagnostics.find(
			(candidate) => candidate.code === DiagnosticCode.RESERVED_IDENTIFIER,
		);
		expect(diagnostic).toBeDefined();
		expect(diagnostic!.message).toContain("__lookup_");
		expect(diagnostic!.span).toBeDefined();
	});

	test("gf without the reserved prefix does not emit RESERVED_IDENTIFIER", () => {
		const { diagnostics } = compile(
			"gf my_curve { xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.RESERVED_IDENTIFIER,
			),
		).toBe(false);
	});
});

describe("XPTS_YPTS_COUNT_MISMATCH", () => {
	test("xpts 3 elements, ypts 5 elements emits XPTS_YPTS_COUNT_MISMATCH", () => {
		const { diagnostics } = compile(
			"gf f { xpts: [0, 0.5, 1] ypts: [0, 0.2, 0.5, 0.8, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.XPTS_YPTS_COUNT_MISMATCH,
			),
		).toBe(true);
	});

	test("xpts 1 element, ypts 2 elements emits XPTS_YPTS_COUNT_MISMATCH", () => {
		const { diagnostics } = compile("gf f { xpts: [0] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.XPTS_YPTS_COUNT_MISMATCH,
			),
		).toBe(true);
	});
});

describe("XPTS_NOT_ASCENDING", () => {
	test("xpts out of order emits XPTS_NOT_ASCENDING", () => {
		const { diagnostics } = compile(
			"gf f { xpts: [0, 0.5, 0.25, 1] ypts: [0, 0.5, 0.25, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XPTS_NOT_ASCENDING,
			),
		).toBe(true);
	});

	test("xpts descending emits XPTS_NOT_ASCENDING", () => {
		const { diagnostics } = compile("gf f { xpts: [1, 0] ypts: [1, 0] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XPTS_NOT_ASCENDING,
			),
		).toBe(true);
	});

	test("xpts equal adjacent values emits XPTS_NOT_ASCENDING", () => {
		const { diagnostics } = compile(
			"gf f { xpts: [0, 0.5, 0.5, 1] ypts: [0, 0.3, 0.7, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XPTS_NOT_ASCENDING,
			),
		).toBe(true);
	});

	test("xpts strictly ascending does not emit error", () => {
		const { diagnostics } = compile(
			"gf f { xpts: [0, 0.25, 0.75, 1] ypts: [0, 0.3, 0.7, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.XPTS_NOT_ASCENDING,
			),
		).toBe(false);
	});
});

describe("STEP_LAST_YPTS_MISMATCH", () => {
	test("step kind with differing last two ypts emits STEP_LAST_YPTS_MISMATCH", () => {
		const { diagnostics } = compile(
			"gf f { kind: step xscale: [0, 1] ypts: [0, 0.5, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.STEP_LAST_YPTS_MISMATCH,
			),
		).toBe(true);
	});

	test("step kind with matching last two ypts is valid", () => {
		const { diagnostics } = compile(
			"gf f { kind: step xscale: [0, 1] ypts: [0, 0.5, 1, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.STEP_LAST_YPTS_MISMATCH,
			),
		).toBe(false);
	});
});

describe("DUPLICATE_GF", () => {
	test("two gf declarations with same name emits DUPLICATE_GF", () => {
		const { diagnostics } = compile(`
      gf f { xscale: [0, 1] ypts: [0, 1] }
      gf f { xscale: [0, 1] ypts: [1, 0] }
    `);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.DUPLICATE_GF,
			),
		).toBe(true);
	});
});

describe("GF_NAME_CONFLICT", () => {
	test("gf with same name as stock emits GF_NAME_CONFLICT", () => {
		const { diagnostics } = compile("gf s { xscale: [0, 1] ypts: [0, 1] }");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_NAME_CONFLICT,
			),
		).toBe(true);
	});

	test("gf with same name as aux emits GF_NAME_CONFLICT", () => {
		const { diagnostics } = compile(`
      aux my_var = 1
      gf my_var { xscale: [0, 1] ypts: [0, 1] }
    `);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_NAME_CONFLICT,
			),
		).toBe(true);
	});

	test("unique gf name does not conflict", () => {
		const { diagnostics } = compile(
			"gf unique_curve { xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_NAME_CONFLICT,
			),
		).toBe(false);
	});
});

describe("GF_WRONG_ARITY", () => {
	test("calling named GF with 0 args emits GF_WRONG_ARITY", () => {
		const { diagnostics } = compile(`
      gf f { xscale: [0, 1] ypts: [0, 1] }
      aux result = f()
    `);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_WRONG_ARITY,
			),
		).toBe(true);
	});

	test("calling named GF with 2 args emits GF_WRONG_ARITY", () => {
		const { diagnostics } = compile(`
      gf f { xscale: [0, 1] ypts: [0, 1] }
      aux result = f(s, s)
    `);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_WRONG_ARITY,
			),
		).toBe(true);
	});

	test("calling named GF with 1 arg does not emit GF_WRONG_ARITY", () => {
		const { diagnostics } = compile(`
      gf f { xscale: [0, 1] ypts: [0, 1] }
      aux result = f(s)
    `);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_WRONG_ARITY,
			),
		).toBe(false);
	});

	test("GF_WRONG_ARITY diagnostic carries a span", () => {
		const { diagnostics } = compile(`
      gf f { xscale: [0, 1] ypts: [0, 1] }
      aux result = f()
    `);
		const diagnostic = diagnostics.find(
			(candidate) => candidate.code === DiagnosticCode.GF_WRONG_ARITY,
		);
		expect(diagnostic?.span).toBeDefined();
	});

	test("wrong-arity GF call still compiles its arguments", () => {
		const { diagnostics } = compile(`
      gf f { xscale: [0, 1] ypts: [0, 1] }
      aux result = f(s, ghost)
    `);
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.GF_WRONG_ARITY,
			),
		).toBe(true);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.UNDEFINED_IDENTIFIER &&
					diagnostic.message.includes("ghost"),
			),
		).toBe(true);
	});
});

describe("LOOKUP_TOO_FEW_YPTS", () => {
	test("lookup with only 1 ypoint emits LOOKUP_TOO_FEW_YPTS", () => {
		const { diagnostics } = compile("aux result = lookup(s, 0)");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.LOOKUP_TOO_FEW_YPTS,
			),
		).toBe(true);
	});

	test("lookup with 0 ypoints (just input) emits LOOKUP_TOO_FEW_YPTS", () => {
		const { diagnostics } = compile("aux result = lookup(s)");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.LOOKUP_TOO_FEW_YPTS,
			),
		).toBe(true);
	});

	test("lookup with 2 ypoints does not emit LOOKUP_TOO_FEW_YPTS", () => {
		const { diagnostics } = compile("aux result = lookup(s, 0, 1)");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.LOOKUP_TOO_FEW_YPTS,
			),
		).toBe(false);
	});

	test("LOOKUP_TOO_FEW_YPTS diagnostic carries a span", () => {
		const { diagnostics } = compile("aux result = lookup(s, 0)");
		const diagnostic = diagnostics.find(
			(candidate) => candidate.code === DiagnosticCode.LOOKUP_TOO_FEW_YPTS,
		);
		expect(diagnostic?.span).toBeDefined();
	});

	test("lookup with too few args still compiles its input", () => {
		const { diagnostics } = compile("aux result = lookup(ghost)");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.LOOKUP_TOO_FEW_YPTS,
			),
		).toBe(true);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.UNDEFINED_IDENTIFIER &&
					diagnostic.message.includes("ghost"),
			),
		).toBe(true);
	});
});

describe("LOOKUP max arity", () => {
	test("lookup with more than 1000 y-points emits WRONG_ARITY", () => {
		const yPoints = Array.from({ length: 1001 }, (_, index) => index).join(
			", ",
		);
		const { diagnostics } = compile(`aux result = lookup(s, ${yPoints})`);
		const diagnostic = diagnostics.find(
			(candidate) => candidate.code === DiagnosticCode.WRONG_ARITY,
		);
		expect(diagnostic).toBeDefined();
		expect(diagnostic!.span).toBeDefined();
	});

	test("lookup with exactly 1000 y-points compiles clean", () => {
		const yPoints = Array.from({ length: 1000 }, (_, index) => index).join(
			", ",
		);
		const ir = compileValid(`aux result = lookup(s, ${yPoints})`);
		expect(ir.graphicalFunctions[0].ypts).toHaveLength(1000);
	});
});

describe("LOOKUP_NON_LITERAL_YPTS", () => {
	test("lookup with variable as y-point emits LOOKUP_NON_LITERAL_YPTS", () => {
		const { diagnostics } = compile(`
      aux scale = 0.5
      aux result = lookup(s, 0, scale, 1)
    `);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
			),
		).toBe(true);
	});

	test("lookup with expression as y-point emits LOOKUP_NON_LITERAL_YPTS", () => {
		const { diagnostics } = compile("aux result = lookup(s, 0, 0.3 + 0.2, 1)");
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
			),
		).toBe(true);
	});

	test("lookup with all literal ypts does not emit LOOKUP_NON_LITERAL_YPTS", () => {
		const { diagnostics } = compile("aux result = lookup(s, 0, 0.5, 1)");
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
			),
		).toBe(false);
	});

	test("lookup with negative literal ypts is valid", () => {
		const { diagnostics } = compile("aux result = lookup(s, -1, 0, 1)");
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
			),
		).toBe(false);
	});

	test("LOOKUP_NON_LITERAL_YPTS diagnostic carries a span", () => {
		const { diagnostics } = compile("aux result = lookup(s, 0, s, 1)");
		const diagnostic = diagnostics.find(
			(candidate) => candidate.code === DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
		);
		expect(diagnostic?.span).toBeDefined();
	});

	test("parenthesised literal y-point is accepted", () => {
		const ir = compileValid("aux result = lookup(s, (0), 1)");
		expect(ir.graphicalFunctions[0].ypts).toEqual([0, 1]);
	});

	test("parenthesised negative literal y-point is accepted", () => {
		const ir = compileValid("aux result = lookup(s, (-1), 1)");
		expect(ir.graphicalFunctions[0].ypts).toEqual([-1, 1]);
	});

	test("lookup with undefined input and non-literal y-point reports both", () => {
		const { diagnostics } = compile("aux result = lookup(ghost, 0, s)");
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.LOOKUP_NON_LITERAL_YPTS,
			),
		).toBe(true);
		expect(
			diagnostics.some(
				(diagnostic) =>
					diagnostic.code === DiagnosticCode.UNDEFINED_IDENTIFIER &&
					diagnostic.message.includes("ghost"),
			),
		).toBe(true);
	});
});

describe("INVALID_GF_KIND", () => {
	test("valid kind does not emit INVALID_GF_KIND", () => {
		for (const kind of ["linear", "extra", "step"]) {
			const ypts = kind === "step" ? "[0, 1, 1]" : "[0, 1]";
			const { diagnostics } = compile(
				`gf f { kind: ${kind} xscale: [0, 1] ypts: ${ypts} }`,
			);
			expect(
				diagnostics.some(
					(diagnostic) => diagnostic.code === DiagnosticCode.INVALID_GF_KIND,
				),
				`kind: ${kind} should not emit INVALID_GF_KIND`,
			).toBe(false);
		}
	});
});

// ── Unknown function name still rejected ──────────────────────────────────────

describe("UNKNOWN_FUNCTION still works", () => {
	test("calling truly unknown function still emits UNKNOWN_FUNCTION", () => {
		const { diagnostics } = compile("aux result = not_a_thing(s)");
		expect(
			diagnostics.some(
				(diagnostic) => diagnostic.code === DiagnosticCode.UNKNOWN_FUNCTION,
			),
		).toBe(true);
	});
});
