import type { FileNode } from "@sysdml/contracts";
import { parseSource } from "@sysdml/parser";
import { describe, it, expect } from "vitest";

import { findIdentAtPosition } from "../src/ast-utils.js";

const SOURCE = `sfd test
time {
  start: 0
  end: 10
  step: 1
}
stock population {
  init: 100
}
aux s = 2
aux birth_rate = s * 0.01
flow births {
  from: null
  to: population
  rate: population * birth_rate
}
birth_rate ->+ births
`;

function parseAstOrThrow(source: string): FileNode {
	const { ast } = parseSource(source);
	if (ast === null) throw new Error("parseSource returned null for test source");
	return ast;
}

describe("findIdentAtPosition", () => {
	const ast = parseAstOrThrow(SOURCE);

	it("resolves the final character of an identifier", () => {
		// 'population' in 'rate: population * birth_rate' spans characters 8-17
		expect(findIdentAtPosition(ast, { line: 14, character: 17 })).toBe(
			"population",
		);
	});

	it("resolves a single-character identifier at its only position", () => {
		// 's' in 'aux birth_rate = s * 0.01' is at character 17
		expect(findIdentAtPosition(ast, { line: 10, character: 17 })).toBe("s");
	});

	it("resolves a flow endpoint identifier", () => {
		// 'population' in 'to: population' starts at character 6
		expect(findIdentAtPosition(ast, { line: 13, character: 6 })).toBe(
			"population",
		);
	});

	it("returns null on a null flow endpoint", () => {
		// 'null' in 'from: null' starts at character 8
		expect(findIdentAtPosition(ast, { line: 12, character: 8 })).toBeNull();
	});

	it("resolves the source endpoint of a connection declaration", () => {
		// 'birth_rate' in 'birth_rate ->+ births' starts at character 0
		expect(findIdentAtPosition(ast, { line: 16, character: 0 })).toBe(
			"birth_rate",
		);
	});

	it("resolves the target endpoint of a connection declaration", () => {
		// 'births' in 'birth_rate ->+ births' starts at character 15
		expect(findIdentAtPosition(ast, { line: 16, character: 15 })).toBe(
			"births",
		);
	});

	it("resolves a stock declaration id", () => {
		// 'population' in 'stock population {' starts at character 6
		expect(findIdentAtPosition(ast, { line: 6, character: 8 })).toBe(
			"population",
		);
	});

	it("resolves a flow declaration id", () => {
		// 'births' in 'flow births {' starts at character 5
		expect(findIdentAtPosition(ast, { line: 11, character: 5 })).toBe(
			"births",
		);
	});

	it("returns null on whitespace", () => {
		expect(findIdentAtPosition(ast, { line: 14, character: 7 })).toBeNull();
	});
});
