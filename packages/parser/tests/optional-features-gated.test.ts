import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";

const TIME_BLOCK = `time { start: 0 end: 10 step: 1 }`;
const ONE_STOCK = `stock s { init: 0 }`;

function expectParseError(src: string) {
	const { ast, diagnostics } = parseSource(src);
	expect(ast, `expected null AST for src: ${src}`).toBeNull();
	expect(
		diagnostics.length,
		`expected at least one diagnostic for src: ${src}`,
	).toBeGreaterThan(0);
}

describe("optional XMILE features are grammar-gated (B5)", () => {
	// Arrays (XMILE §2.2.1 `<uses_arrays>`).

	test("array subscript in an expression is a parse error", () => {
		expectParseError(`sfd m\n${TIME_BLOCK}\n${ONE_STOCK}\naux y = s[1]`);
	});

	test("subscripted stock declaration is a parse error", () => {
		expectParseError(`sfd m\n${TIME_BLOCK}\nstock s[1] { init: 0 }`);
	});

	test("dimensioned variable syntax is a parse error", () => {
		expectParseError(`sfd m\n${TIME_BLOCK}\n${ONE_STOCK}\naux x[i] = 1`);
	});

	// Conveyors / queues (XMILE §2.2.1 `<uses_conveyor>`, `<uses_queue>`).

	test("'conveyor' is not a top-level declaration keyword", () => {
		expectParseError(
			`sfd m\n${TIME_BLOCK}\n${ONE_STOCK}\nconveyor c { init: 0 }`,
		);
	});

	test("'queue' is not a top-level declaration keyword", () => {
		expectParseError(`sfd m\n${TIME_BLOCK}\n${ONE_STOCK}\nqueue q { init: 0 }`);
	});

	// Macros (XMILE §2.2.1 `<uses_macros>`).

	test("'macro' is not a top-level declaration keyword", () => {
		expectParseError(`sfd m\n${TIME_BLOCK}\n${ONE_STOCK}\nmacro foo() = 1`);
	});
});
