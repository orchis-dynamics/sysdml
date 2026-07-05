import { parseSource } from "@sysdml/parser";
import { describe, it, expect } from "vitest";

import { getDefinitionLocation } from "../../src/features/definition.js";

const SOURCE = `sfd test
time {
  start: 0
  end: 10
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
`;

describe("getDefinitionLocation", () => {
	it("resolves a stock reference in an expression to the stock declaration", () => {
		const { ast } = parseSource(SOURCE);
		// 'population' in 'rate: population * birth_rate' — line 14 (1-indexed) = 13 (0-indexed)
		const result = getDefinitionLocation(ast!, "file:///test.sysdml", {
			line: 13,
			character: 8,
		});
		expect(result).not.toBeNull();
		// stock population is on line 7 (1-indexed) = line 6 (0-indexed)
		expect(result!.range.start.line).toBe(6);
	});

	it("returns null for a position not on an identifier", () => {
		const { ast } = parseSource(SOURCE);
		const result = getDefinitionLocation(ast!, "file:///test.sysdml", {
			line: 0,
			character: 0,
		});
		expect(result).toBeNull();
	});

	it("returns null for a builtin function name (no user declaration)", () => {
		const src = SOURCE.replace(
			"rate: population * birth_rate",
			"rate: ABS(population)",
		);
		const { ast } = parseSource(src);
		// ABS has no user declaration
		const result = getDefinitionLocation(ast!, "file:///test.sysdml", {
			line: 13,
			character: 8,
		});
		expect(result).toBeNull();
	});

	it("resolves a flow endpoint to the stock declaration", () => {
		const { ast } = parseSource(SOURCE);
		if (ast === null) throw new Error("parseSource returned null");
		// 'population' in 'to: population' — line 12 (0-indexed), col 6
		const result = getDefinitionLocation(ast, "file:///test.sysdml", {
			line: 12,
			character: 6,
		});
		expect(result).not.toBeNull();
		// stock population is declared on line 6 (0-indexed)
		expect(result?.range.start.line).toBe(6);
	});

	it("resolves a connection endpoint to its declaration", () => {
		const src = `${SOURCE}birth_rate ->+ births\n`;
		const { ast } = parseSource(src);
		if (ast === null) throw new Error("parseSource returned null");
		// 'birth_rate' in 'birth_rate ->+ births' — line 15 (0-indexed), col 0
		const result = getDefinitionLocation(ast, "file:///test.sysdml", {
			line: 15,
			character: 0,
		});
		expect(result).not.toBeNull();
		// aux birth_rate is declared on line 9 (0-indexed)
		expect(result?.range.start.line).toBe(9);
	});
});
