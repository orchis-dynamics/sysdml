import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";

describe("multi-model grammar relaxation (B1)", () => {
	test("file with two model declarations parses without syntax errors", () => {
		const src = `model main\nmodel sub\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});

	test("first model declaration becomes ast.model; rest go to ast.submodels", () => {
		const src = `model main\nmodel sub\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("main");
		expect(ast!.submodels).toHaveLength(1);
		const firstSubmodel = ast!.submodels[0];
		if (firstSubmodel === undefined) throw new Error("expected one submodel");
		expect(firstSubmodel.id).toBe("sub");
	});

	test("a third model declaration also lands in submodels in source order", () => {
		const src = `model main\nmodel sub_a\nmodel sub_b\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("main");
		expect(ast!.submodels.map((m) => m.id)).toEqual(["sub_a", "sub_b"]);
	});

	test("single-model file still has empty submodels array (no breaking change)", () => {
		const src = `model only\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("only");
		expect(ast!.submodels).toEqual([]);
	});
});

describe("uniform model naming (B2)", () => {
	test("a bare 'model' keyword with no identifier is a parse error", () => {
		const src = `model\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("second 'model' declaration without an identifier is a parse error (post-B1)", () => {
		const src = `model main\nmodel\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("third 'model' declaration without an identifier is a parse error (post-B1)", () => {
		const src = `model main\nmodel sub\nmodel\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast, diagnostics } = parseSource(src);
		expect(ast).toBeNull();
		expect(diagnostics.length).toBeGreaterThan(0);
	});

	test("every parsed model declaration carries a non-empty id (sanity check)", () => {
		const src = `model main\nmodel sub_a\nmodel sub_b\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).not.toBe("");
		for (const submodel of ast!.submodels) {
			expect(submodel.id).not.toBe("");
		}
	});
});
