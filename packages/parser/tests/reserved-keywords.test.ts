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

// Declaration keywords per `dsl.md` "Lexical rules" — these are lexer tokens,
// so any attempt to use them as an identifier fails at parse time.
const DECLARATION_KEYWORDS = [
	"model",
	"time",
	"stock",
	"aux",
	"flow",
	"from",
	"to",
	"rate",
	"init",
	"start",
	"end",
	"step",
	"null",
];

// Expression keywords — operators and control-flow tokens used by the
// expression grammar (`IF cond THEN expr ELSE expr`, logical/relational
// operators). Same rule: lexer tokens, not identifiers.
const EXPRESSION_KEYWORDS = ["IF", "THEN", "ELSE", "AND", "OR", "NOT"];

describe("declaration keywords cannot be used as variable identifiers (B4.3c, B10.6)", () => {
	for (const keyword of DECLARATION_KEYWORDS) {
		test(`'${keyword}' rejected as stock id`, () => {
			expectParseError(
				`sfd m\n${TIME_BLOCK}\nstock ${keyword} { init: 0 }`,
			);
		});
	}
});

describe("expression keywords cannot be used as variable identifiers (B10.6)", () => {
	for (const keyword of EXPRESSION_KEYWORDS) {
		test(`'${keyword}' rejected as aux id`, () => {
			expectParseError(
				`sfd m\n${TIME_BLOCK}\n${ONE_STOCK}\naux ${keyword} = 1`,
			);
		});
	}
});
