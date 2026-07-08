import { describe, expect, test } from "vitest";
import {
	CompletionItemKind,
	SymbolKind,
} from "vscode-languageserver-protocol";
import type {
	CompletionItem,
	DocumentSymbol,
	Hover,
} from "vscode-languageserver-protocol";

import {
	lspCompletionItemToMonaco,
	lspHoverToMonaco,
	lspDocumentSymbolsToMonaco,
	markupToString,
} from "../app/lib/lsp/adapters";

const defaultRange = {
	startLineNumber: 1,
	startColumn: 1,
	endLineNumber: 1,
	endColumn: 1,
};

describe("adapters-features", () => {
	test("converts a completion item and maps kind", () => {
		const item: CompletionItem = {
			label: "population",
			kind: CompletionItemKind.Variable,
			detail: "stock",
		};
		const converted = lspCompletionItemToMonaco(item, defaultRange);
		expect(converted.label).toBe("population");
		expect(converted.insertText).toBe("population");
		expect(converted.detail).toBe("stock");
		expect(typeof converted.kind).toBe("number");
	});

	test("flattens hover markup to a string", () => {
		const hover: Hover = {
			contents: { kind: "markdown", value: "**stock** population" },
		};
		const converted = lspHoverToMonaco(hover);
		expect(converted.contents[0]?.value).toContain("population");
	});

	test("markupToString handles arrays and plain strings", () => {
		expect(markupToString("plain")).toBe("plain");
		expect(
			markupToString([
				"a",
				{ kind: "plaintext", value: "b" },
			]),
		).toContain("b");
	});

	test("converts nested document symbols", () => {
		const symbols: DocumentSymbol[] = [
			{
				name: "population",
				kind: SymbolKind.Variable,
				range: {
					start: { line: 0, character: 0 },
					end: { line: 2, character: 0 },
				},
				selectionRange: {
					start: { line: 0, character: 6 },
					end: { line: 0, character: 16 },
				},
			},
		];
		const converted = lspDocumentSymbolsToMonaco(symbols);
		expect(converted[0]?.name).toBe("population");
		expect(converted[0]?.range.startLineNumber).toBe(1);
	});

	test("recurses into child document symbols", () => {
		const symbols: DocumentSymbol[] = [
			{
				name: "model",
				kind: SymbolKind.Namespace,
				range: {
					start: { line: 0, character: 0 },
					end: { line: 4, character: 0 },
				},
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 5 },
				},
				children: [
					{
						name: "population",
						kind: SymbolKind.Variable,
						range: {
							start: { line: 1, character: 0 },
							end: { line: 1, character: 5 },
						},
						selectionRange: {
							start: { line: 1, character: 0 },
							end: { line: 1, character: 5 },
						},
					},
				],
			},
		];
		const converted = lspDocumentSymbolsToMonaco(symbols);
		expect(converted[0]?.children?.[0]?.name).toBe("population");
		expect(converted[0]?.children?.[0]?.range.startLineNumber).toBe(2);
	});
});
