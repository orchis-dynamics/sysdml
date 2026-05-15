import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";

describe("error handling", () => {
	test("missing closing brace produces diagnostic", () => {
		const src = `model m\ntime {\n  start: 0`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics.length).toBeGreaterThan(0);
		expect(ast).toBeNull();
	});

	test("diagnostic includes line and col", () => {
		const src = `model m\naux x =`;
		const { diagnostics } = parseSource(src);
		expect(diagnostics.length).toBeGreaterThan(0);
		expect(typeof diagnostics[0].span.start.line).toBe("number");
		expect(typeof diagnostics[0].span.start.col).toBe("number");
	});

	test("unknown token produces diagnostic", () => {
		const src = `model m\naux x = @`;
		const { diagnostics } = parseSource(src);
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("empty source produces diagnostic", () => {
		const { ast, diagnostics } = parseSource("");
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("missing model name produces diagnostic", () => {
		const src = `model`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("valid source returns no diagnostics", () => {
		const src = `model m\naux x = 1`;
		const { diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
	});
});

describe("builder diagnostics — position literal", () => {
	test("position literal with non-x/y keys produces diagnostic with correct span", () => {
		const src = `model m\naux a = 0 { position: { a: 5, b: 10 } }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics).toHaveLength(1);
		const diag = diagnostics[0];
		if (diag === undefined) throw new Error("expected diagnostic");
		expect(diag.message).toMatch(/position literal keys must be 'x' and 'y'/);
		expect(diag.message).toMatch(/got 'a' and 'b'/);
		expect(diag.span.start.line).toBe(2);
		expect(diag.span.end.line).toBe(2);
		// span points to the posLiteral, not to (0,0)
		expect(diag.span.start.col).toBeGreaterThan(0);
		expect(diag.span.end.col).toBeGreaterThan(diag.span.start.col);
	});

	test("bad position keys on stock decl produce diagnostic", () => {
		const src = `model m\nstock s {\n  init: 1\n  position: { foo: 1, bar: 2 }\n}`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toMatch(/got 'foo' and 'bar'/);
	});

	test("bad position keys on flow decl produce diagnostic", () => {
		const src = `model m\nflow f {\n  from: null\n  to: null\n  rate: 1\n  position: { lat: 1, lng: 2 }\n}`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toMatch(/got 'lat' and 'lng'/);
	});

	test("bad keys in connection via produce diagnostic", () => {
		const src = `model m\na ->+ b { via: { row: 1, col: 2 } }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]?.message).toMatch(/got 'row' and 'col'/);
	});

	test("multiple bad posLiterals each produce their own diagnostic", () => {
		// Builder continues past the first error to collect all of them.
		const src = `model m\nstock s {\n  init: 1\n  position: { a: 1, b: 2 }\n}\naux x = 1 { position: { p: 3, q: 4 } }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics).toHaveLength(2);
		expect(diagnostics[0]?.message).toMatch(/got 'a' and 'b'/);
		expect(diagnostics[1]?.message).toMatch(/got 'p' and 'q'/);
	});

	test("y/x order parses correctly (no diagnostic)", () => {
		const src = `model m\nstock s {\n  init: 1\n  position: { y: 100, x: 200 }\n}`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected non-null ast");
		const stock = ast.decls[0];
		if (stock?.type !== "StockDeclaration") throw new Error("expected StockDeclaration");
		expect(stock.position).toEqual({
			type: "Position",
			x: 200,
			y: 100,
			span: expect.any(Object),
		});
	});
});

describe("builder diagnostics — gf body", () => {
	test("missing ypts produces diagnostic", () => {
		const src = `model m\ngf f { xscale: [0, 1] }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		const diag = diagnostics.find((d) => d.message.includes("missing required 'ypts'"));
		expect(diag).toBeDefined();
	});

	test("invalid kind produces diagnostic", () => {
		const src = `model m\ngf f { kind: foo\n xscale: [0, 1] ypts: [0, 1] }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		const diag = diagnostics.find((d) => d.message.includes("'kind' must be one of"));
		expect(diag).toBeDefined();
		expect(diag?.message).toMatch(/got 'foo'/);
	});

	test("valid kinds are accepted", () => {
		for (const k of ["linear", "extra", "step"]) {
			const src = `model m\ngf f { kind: ${k}\n xscale: [0, 1] ypts: [0, 1] }`;
			const { diagnostics } = parseSource(src);
			expect(diagnostics, `kind '${k}' should be accepted`).toHaveLength(0);
		}
	});

	test("xscale and xpts both present produces diagnostic", () => {
		const src = `model m\ngf f { xscale: [0, 1] xpts: [0, 0.5, 1] ypts: [0, 0.5, 1] }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		const diag = diagnostics.find((d) =>
			d.message.includes("both 'xscale' and 'xpts'"),
		);
		expect(diag).toBeDefined();
	});

	test("duplicate gf property reports on second occurrence", () => {
		const src = `model m\ngf f { ypts: [0, 1]\n ypts: [2, 3] }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		const diag = diagnostics.find((d) => d.message.includes("duplicate 'ypts'"));
		expect(diag).toBeDefined();
		// Second ypts is on line 3 — span should point there, not at the first.
		expect(diag?.span.start.line).toBe(3);
	});

	test("multiple gf validation failures all reported", () => {
		// bad kind + duplicate kind + missing ypts → 3 separate diagnostics
		const src = `model m\ngf f { kind: bogus\n kind: linear }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics.some((d) => d.message.includes("got 'bogus'"))).toBe(true);
		expect(diagnostics.some((d) => d.message.includes("duplicate 'kind'"))).toBe(true);
		expect(diagnostics.some((d) => d.message.includes("missing required 'ypts'"))).toBe(true);
		expect(diagnostics).toHaveLength(3);
	});

});

describe("builder diagnostics — aux metadata block", () => {
	test("duplicate 'position' produces diagnostic on second occurrence", () => {
		const src = `model m\naux x = 1 { position: { x: 1, y: 2 }\n position: { x: 3, y: 4 } }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics).toHaveLength(1);
		const diag = diagnostics[0];
		if (diag === undefined) throw new Error("expected diagnostic");
		expect(diag.message).toMatch(/duplicate 'position'/);
		// Second position is on line 3 — diagnostic should point there, not at the first.
		expect(diag.span.start.line).toBe(3);
	});
});
