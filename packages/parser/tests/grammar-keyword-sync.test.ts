import { ALL_KEYWORDS } from "@sysdml/contracts";
import { describe, expect, test } from "vitest";

import { SYSDMLLexer } from "../generated/SYSDMLLexer.js";

function grammarReservedWords(): Set<string> {
	const wordLiterals = SYSDMLLexer.literalNames
		.filter((name): name is string => name !== null)
		.map((quotedLiteral) => quotedLiteral.slice(1, -1))
		.filter((literal) => /^[A-Za-z_]+$/.test(literal));
	return new Set(wordLiterals);
}

describe("keyword vocabulary stays in sync with SYSDML.g4", () => {
	test("ALL_KEYWORDS matches the grammar's reserved word tokens exactly", () => {
		expect(new Set(ALL_KEYWORDS)).toEqual(grammarReservedWords());
	});

	test("ALL_KEYWORDS contains no duplicates across categories", () => {
		expect(ALL_KEYWORDS.length).toBe(new Set(ALL_KEYWORDS).size);
	});
});
