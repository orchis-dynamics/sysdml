import { parseSource } from "@sysdml/parser";
import { describe, test, expect } from "vitest";
import { compileAST } from "../src/index.js";
import type { IR } from "../src/index.js";

function parse(src: string) {
	const { ast, diagnostics } = parseSource(src);
	if (diagnostics.length > 0)
		throw new Error(`Parse error: ${diagnostics[0].message}`);
	return ast!;
}

function compile(src: string): IR {
	const result = compileAST(parse(src));
	if (result.diagnostics.length > 0)
		throw new Error(`Compile error: ${result.diagnostics[0].message}`);
	return result.ir!;
}

const BASE = `
model m
time { start: 0\n end: 10\n step: 1 }
`.trim();

describe("IR layout — stock", () => {
	test("stock position threads to IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 100\n position: { x: 400, y: 300 } }`);
		expect(ir.stocks[0].position).toEqual({ x: 400, y: 300 });
	});

	test("stock without position has undefined position in IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 100 }`);
		expect(ir.stocks[0].position).toBeUndefined();
	});
});

describe("IR layout — aux", () => {
	test("aux with metadata block position threads to IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 0 }\naux birth_rate = 0.02 { position: { x: 200, y: 300 } }`);
		expect(ir.aux[0].position).toEqual({ x: 200, y: 300 });
	});

	test("aux expr form has no position in IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 0 }\naux birth_rate = 0.02`);
		expect(ir.aux[0].position).toBeUndefined();
	});
});

describe("IR layout — flow", () => {
	test("flow position threads to IR", () => {
		const ir = compile(
			`${BASE}\nstock s { init: 0 }\nflow f { from: null\n to: s\n rate: 0.01\n position: { x: 200, y: 300 } }`,
		);
		expect(ir.flows[0].position).toEqual({ x: 200, y: 300 });
	});

	test("flow via threads to IR", () => {
		const ir = compile(
			`${BASE}\nstock s { init: 0 }\nflow f { from: null\n to: s\n rate: 0.01\n via: [{ x: 150, y: 150 }, { x: 180, y: 250 }] }`,
		);
		expect(ir.flows[0].via).toEqual([
			{ x: 150, y: 150 },
			{ x: 180, y: 250 },
		]);
	});

	test("flow without layout has no position or via in IR", () => {
		const ir = compile(
			`${BASE}\nstock s { init: 0 }\nflow f { from: null\n to: s\n rate: 0.01 }`,
		);
		expect(ir.flows[0].position).toBeUndefined();
		expect(ir.flows[0].via).toBeUndefined();
	});
});

describe("IR layout — connection", () => {
	test("connection angle threads to IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 0 }\naux a = 1\naux b = 2\na ->+ b { angle: 45 }`);
		expect(ir.connections[0].angle).toBe(45);
		expect(ir.connections[0].via).toBeUndefined();
	});

	test("connection via threads to IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 0 }\naux a = 1\naux b = 2\na ->+ b { angle: 30\n via: { x: 150, y: 80 } }`);
		expect(ir.connections[0].angle).toBe(30);
		expect(ir.connections[0].via).toEqual({ x: 150, y: 80 });
	});

	test("connection without block has no angle or via in IR", () => {
		const ir = compile(`${BASE}\nstock s { init: 0 }\naux a = 1\naux b = 2\na ->+ b`);
		expect(ir.connections[0].angle).toBeUndefined();
		expect(ir.connections[0].via).toBeUndefined();
	});
});
