import { parseSource } from "@sysdml/parser";
import { describe, test, it, expect, beforeAll } from "vitest";

import { DiagnosticCode } from "@sysdml/contracts";
import type { IR, IRExpressionNode } from "@sysdml/contracts";
import { compileAST } from "../src/index.js";

function parse(src: string) {
	const { ast, diagnostics } = parseSource(src);
	if (diagnostics.length > 0)
		throw new Error(`Parse error: ${diagnostics[0].message}`);
	return ast!;
}

const POPULATION_GROWTH = `
sfd population_growth

time {
  start: 0
  end: 100
  step: 1
}

stock population {
  init: 100
}

aux birth_rate = 0.02

flow births {
  from: null
  to: population
  rate: population * birth_rate
}
`.trim();

// ── Happy path ────────────────────────────────────────────────────────────────

describe("population_growth compiles", () => {
	let ir: IR;

	beforeAll(() => {
		const result = compileAST(parse(POPULATION_GROWTH));
		expect(result.diagnostics).toHaveLength(0);
		expect(result.ir).not.toBeNull();
		ir = result.ir!;
	});

	test("ir_version is 0.1", () => {
		expect(ir.ir_version).toBe("0.1");
	});

	test("model id", () => {
		expect(ir.model.id).toBe("population_growth");
	});

	test("time block", () => {
		expect(ir.time).toEqual({ start: 0, end: 100, step: 1 });
	});

	test("stock init is Num(100)", () => {
		expect(ir.stocks).toHaveLength(1);
		expect(ir.stocks[0].id).toBe("population");
		expect(ir.stocks[0].init).toEqual({ type: "Number", value: 100 });
	});

	test("aux expr is Num(0.02)", () => {
		expect(ir.auxiliaries).toHaveLength(1);
		expect(ir.auxiliaries[0].id).toBe("birth_rate");
		expect(ir.auxiliaries[0].expr).toEqual({ type: "Number", value: 0.02 });
	});

	test("flow endpoints and rate expr", () => {
		expect(ir.flows).toHaveLength(1);
		const flow = ir.flows[0];
		expect(flow.id).toBe("births");
		expect(flow.from).toBeNull();
		expect(flow.to).toBe("population");
		const rate: IRExpressionNode = {
			type: "BinaryOperation",
			op: "*",
			left: { type: "Reference", id: "population" },
			right: { type: "Reference", id: "birth_rate" },
		};
		expect(flow.rate).toEqual(rate);
	});

	test("no connections in SFD model", () => {
		expect(ir.connections).toHaveLength(0);
	});
});

// ── Expression compilation ────────────────────────────────────────────────────

describe("expression compilation", () => {
	test("unary minus", () => {
		const ast = parse(
			`sfd m\nstock s { init: 0 }\naux x = -1\ntime { start:0 end:1 step:1 }`,
		);
		const { ir } = compileAST(ast);
		expect(ir!.auxiliaries[0].expr).toEqual({
			type: "UnaryMinus",
			operand: { type: "Number", value: 1 },
		});
	});

	test("grouped expr is collapsed", () => {
		const ast = parse(
			`sfd m\nstock s { init: 0 }\naux x = (2 + 3)\ntime { start:0 end:1 step:1 }`,
		);
		const { ir } = compileAST(ast);
		expect(ir!.auxiliaries[0].expr).toEqual({
			type: "BinaryOperation",
			op: "+",
			left: { type: "Number", value: 2 },
			right: { type: "Number", value: 3 },
		});
	});

	test("nested binary expr precedence preserved", () => {
		const ast = parse(
			`sfd m\nstock s { init: 0 }\naux x = 1 + 2 * 3\ntime { start:0 end:1 step:1 }`,
		);
		const { ir } = compileAST(ast);
		// Parser handles precedence: 1 + (2 * 3)
		expect(ir!.auxiliaries[0].expr).toEqual({
			type: "BinaryOperation",
			op: "+",
			left: { type: "Number", value: 1 },
			right: {
				type: "BinaryOperation",
				op: "*",
				left: { type: "Number", value: 2 },
				right: { type: "Number", value: 3 },
			},
		});
	});
});

// ── Validation errors ─────────────────────────────────────────────────────────

describe("validation", () => {
	test("missing time block", () => {
		const ast = parse(`sfd m\nstock s { init: 0 }`);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) =>
				diagnostic.message.includes("time block"),
			),
		).toBe(true);
	});

	test("missing stock", () => {
		const ast = parse(`sfd m\ntime { start:0 end:1 step:1 }`);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) => diagnostic.message.includes("stock")),
		).toBe(true);
	});

	test("duplicate id", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:1 }\nstock s { init: 0 }\naux s = 1`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) =>
				diagnostic.message.includes("Duplicate identifier 's'"),
			),
		).toBe(true);
	});

	test("undefined identifier in expr", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:1 }\nstock s { init: 0 }\naux x = ghost`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) =>
				diagnostic.message.includes("Undefined identifier 'ghost'"),
			),
		).toBe(true);
	});

	test("flow references unknown stock", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:1 }\nstock s { init: 0 }\nflow f { from: ghost to: s rate: 1 }`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) =>
				diagnostic.message.includes("unknown stock 'ghost'"),
			),
		).toBe(true);
	});

	test("time.step <= 0", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:0 }\nstock s { init: 0 }`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) =>
				diagnostic.message.includes("time.step"),
			),
		).toBe(true);
	});

	test("time.end < time.start", () => {
		const ast = parse(
			`sfd m\ntime { start:10 end:0 step:1 }\nstock s { init: 0 }`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(ir).toBeNull();
		expect(
			diagnostics.some((diagnostic) => diagnostic.message.includes("time.end")),
		).toBe(true);
	});
});

// ── Flow references in expressions ────────────────────────────────────────────

describe("flow references in expressions", () => {
	test("aux referencing a declared flow compiles clean", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:1 }\nstock s { init: 0 }\nflow births { from: null to: s rate: 1 }\naux net_change = births * 2`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(diagnostics).toHaveLength(0);
		expect(ir).not.toBeNull();
		const netChange = ir!.auxiliaries.find(
			(auxiliaryVariable) => auxiliaryVariable.id === "net_change",
		);
		expect(netChange!.expr).toEqual({
			type: "BinaryOperation",
			op: "*",
			left: { type: "Reference", id: "births" },
			right: { type: "Number", value: 2 },
		});
	});

	test("stock init referencing a declared flow compiles clean", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:1 }\nstock s { init: births }\nflow births { from: null to: s rate: 1 }`,
		);
		const { ir, diagnostics } = compileAST(ast);
		expect(diagnostics).toHaveLength(0);
		expect(ir).not.toBeNull();
		expect(ir!.stocks[0].init).toEqual({ type: "Reference", id: "births" });
	});
});

// ── CLD connections ───────────────────────────────────────────────────────────

describe("CLD connections", () => {
	test("connection polarity preserved", () => {
		const ast = parse(
			`sfd m\ntime { start:0 end:1 step:1 }\nstock s { init: 0 }\nA ->+ B\nB ->- C`,
		);
		const { ir } = compileAST(ast);
		expect(ir!.connections).toHaveLength(2);
		expect(ir!.connections[0]).toEqual({ from: "A", polarity: "+", to: "B" });
		expect(ir!.connections[1]).toEqual({ from: "B", polarity: "-", to: "C" });
	});
});

// ── IRDiagnostic spans ────────────────────────────────────────────────────────

describe("IRDiagnostic spans", () => {
	it("DUPLICATE_TIME_BLOCK points at the second time block", () => {
		const { ast } = parseSource(
			"sfd m\ntime { start: 0\n end: 10\n step: 1\n}\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: 0 }",
		);
		const { diagnostics } = compileAST(ast!);
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.DUPLICATE_TIME_BLOCK,
		);
		expect(diag?.span).toBeDefined();
		expect(diag!.span!.start.line).toBeGreaterThan(1);
	});

	it("INVALID_FLOW_ENDPOINT points at the flow declaration", () => {
		const { ast } = parseSource(
			"sfd m\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: 0 }\nflow f {\n  from: ghost\n  to: s\n  rate: 1\n}",
		);
		const { diagnostics } = compileAST(ast!);
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.INVALID_FLOW_ENDPOINT,
		);
		expect(diag?.span).toBeDefined();
		expect(diag!.span!.start.line).toBeGreaterThanOrEqual(1);
	});

	it("DUPLICATE_GF points at the second gf declaration", () => {
		const { ast } = parseSource(
			"sfd m\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: 0 }\ngf lookup { kind: linear\n xscale: [0, 10]\n ypts: [0, 1]\n}\ngf lookup { kind: linear\n xscale: [0, 10]\n ypts: [0, 1]\n}",
		);
		const { diagnostics } = compileAST(ast!);
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.DUPLICATE_GF,
		);
		expect(diag?.span).toBeDefined();
	});

	it("UNDEFINED_IDENTIFIER points at the IdentifierReference token", () => {
		const { ast } = parseSource(
			"sfd m\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: ghost }",
		);
		const { diagnostics } = compileAST(ast!);
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.UNDEFINED_IDENTIFIER,
		);
		expect(diag?.span).toBeDefined();
		expect(diag!.span!.start.line).toBeGreaterThan(0);
	});

	it("WRONG_ARITY points at the function name", () => {
		const { ast } = parseSource(
			"sfd m\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: 0 }\naux x = ABS(1, 2)",
		);
		const { diagnostics } = compileAST(ast!);
		const diag = diagnostics.find((d) => d.code === DiagnosticCode.WRONG_ARITY);
		expect(diag?.span).toBeDefined();
	});

	it("UNKNOWN_FUNCTION points at the function name", () => {
		const { ast } = parseSource(
			"sfd m\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: 0 }\naux x = ghost_fn(1)",
		);
		const { diagnostics } = compileAST(ast!);
		const diag = diagnostics.find(
			(d) => d.code === DiagnosticCode.UNKNOWN_FUNCTION,
		);
		expect(diag?.span).toBeDefined();
	});
});

// ── CLD kind skips simulatable-only diagnostics ───────────────────────────────

describe("CLD kind skips simulatable-only diagnostics", () => {
	test("cld file with no time and no stock produces no MISSING_TIME_BLOCK or MISSING_STOCK", () => {
		const ast = parse(`cld m\nA ->+ B\nB ->- A`);
		const { ir, diagnostics } = compileAST(ast);
		const codes = diagnostics.map((d) => d.code);
		expect(codes).not.toContain("MISSING_TIME_BLOCK");
		expect(codes).not.toContain("MISSING_STOCK");
		expect(ir).not.toBeNull();
		expect(ir!.connections).toHaveLength(2);
		expect(ir!.stocks).toHaveLength(0);
		expect(ir!.flows).toHaveLength(0);
	});

	test("sfd file with no time block still emits MISSING_TIME_BLOCK", () => {
		const ast = parse(`sfd m\nstock s { init: 0 }`);
		const { diagnostics } = compileAST(ast);
		const codes = diagnostics.map((d) => d.code);
		expect(codes).toContain("MISSING_TIME_BLOCK");
	});

	test("sfd file with no stock still emits MISSING_STOCK", () => {
		const ast = parse(`sfd m\ntime { start: 0 end: 10 step: 1 }`);
		const { diagnostics } = compileAST(ast);
		const codes = diagnostics.map((d) => d.code);
		expect(codes).toContain("MISSING_STOCK");
	});
});
