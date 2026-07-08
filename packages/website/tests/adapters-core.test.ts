import type * as monaco from "monaco-editor";
import { describe, expect, test } from "vitest";
import { DiagnosticSeverity } from "vscode-languageserver-protocol";
import type { Diagnostic, Location } from "vscode-languageserver-protocol";

import {
	diagnosticToMarker,
	lspLocationToMonaco,
	lspRangeToMonaco,
	monacoPositionToLsp,
	monacoChangeToLspContentChange,
} from "../app/lib/lsp/adapters";

function makeMinimalMonacoUri(): monaco.Uri {
	const components = {
		scheme: "inmemory",
		authority: "",
		path: "/playground.sysdml",
		query: "",
		fragment: "",
	};
	const uri: monaco.Uri = {
		...components,
		fsPath: components.path,
		with: () => uri,
		toString: () => `${components.scheme}:${components.path}`,
		toJSON: () => components,
	};
	return uri;
}

describe("adapters-core", () => {
	test("converts an LSP diagnostic to a Monaco marker (1-based)", () => {
		const diagnostic: Diagnostic = {
			range: {
				start: { line: 2, character: 4 },
				end: { line: 2, character: 9 },
			},
			severity: DiagnosticSeverity.Warning,
			message: "unused",
		};
		const marker = diagnosticToMarker(diagnostic);
		expect(marker).toMatchObject({
			startLineNumber: 3,
			startColumn: 5,
			endLineNumber: 3,
			endColumn: 10,
			message: "unused",
			severity: 4,
		});
	});

	test("maps missing severity to Error", () => {
		const diagnostic: Diagnostic = {
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 1 },
			},
			message: "boom",
		};
		expect(diagnosticToMarker(diagnostic).severity).toBe(8);
	});

	test("stringifies a numeric diagnostic code onto the marker", () => {
		const diagnostic: Diagnostic = {
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 1 },
			},
			message: "boom",
			code: 1234,
		};
		expect(diagnosticToMarker(diagnostic).code).toBe("1234");
	});

	test("converts an LSP location to a Monaco location", () => {
		const location: Location = {
			uri: "inmemory://playground.sysdml",
			range: {
				start: { line: 1, character: 2 },
				end: { line: 1, character: 5 },
			},
		};
		const uri = makeMinimalMonacoUri();
		const converted = lspLocationToMonaco(location, uri);
		expect(converted.uri).toBe(uri);
		expect(converted.range).toEqual({
			startLineNumber: 2,
			startColumn: 3,
			endLineNumber: 2,
			endColumn: 6,
		});
	});

	test("converts an LSP range to a 1-based Monaco range", () => {
		const range = lspRangeToMonaco({
			start: { line: 0, character: 0 },
			end: { line: 1, character: 3 },
		});
		expect(range).toEqual({
			startLineNumber: 1,
			startColumn: 1,
			endLineNumber: 2,
			endColumn: 4,
		});
	});

	test("converts a Monaco position to a 0-based LSP position", () => {
		expect(monacoPositionToLsp({ lineNumber: 5, column: 2 })).toEqual({
			line: 4,
			character: 1,
		});
	});

	test("maps a Monaco content change to LSP incremental change", () => {
		const change: monaco.editor.IModelContentChange = {
			range: {
				startLineNumber: 1,
				startColumn: 1,
				endLineNumber: 1,
				endColumn: 1,
			},
			rangeOffset: 0,
			rangeLength: 0,
			text: "x",
		};
		expect(monacoChangeToLspContentChange(change)).toEqual({
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 },
			},
			text: "x",
		});
	});
});
