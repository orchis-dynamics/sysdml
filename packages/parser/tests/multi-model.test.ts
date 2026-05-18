import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";

describe("multi-model grammar relaxation (B1)", () => {
	test("file with two model declarations parses without syntax errors", () => {
		const src = `model main\nmodel sub\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast, diagnostics } = parseSource(src);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
	});

	test("first model declaration becomes ast.model; rest go to ast.extraModels", () => {
		const src = `model main\nmodel sub\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("main");
		expect(ast!.extraModels).toHaveLength(1);
		expect(ast!.extraModels[0].id).toBe("sub");
	});

	test("a third model declaration also lands in extraModels in source order", () => {
		const src = `model main\nmodel sub_a\nmodel sub_b\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("main");
		expect(ast!.extraModels.map((m) => m.id)).toEqual(["sub_a", "sub_b"]);
	});

	test("single-model file still has empty extraModels array (no breaking change)", () => {
		const src = `model only\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`;
		const { ast } = parseSource(src);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("only");
		expect(ast!.extraModels).toEqual([]);
	});
});
