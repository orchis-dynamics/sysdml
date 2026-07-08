import type * as monaco from "monaco-editor";
import {
	CompletionItemKind,
	DiagnosticSeverity,
	SymbolKind,
} from "vscode-languageserver-protocol";
import type {
	CompletionItem,
	Diagnostic,
	DocumentSymbol,
	Hover,
	Location,
	MarkedString,
	MarkupContent,
	Position,
	Range,
	TextEdit,
} from "vscode-languageserver-protocol";

const MARKER_SEVERITY_ERROR = 8;
const MARKER_SEVERITY_WARNING = 4;
const MARKER_SEVERITY_INFO = 2;
const MARKER_SEVERITY_HINT = 1;

function severityToMarkerSeverity(
	severity: DiagnosticSeverity | undefined,
): number {
	switch (severity) {
		case DiagnosticSeverity.Warning:
			return MARKER_SEVERITY_WARNING;
		case DiagnosticSeverity.Information:
			return MARKER_SEVERITY_INFO;
		case DiagnosticSeverity.Hint:
			return MARKER_SEVERITY_HINT;
		default:
			return MARKER_SEVERITY_ERROR;
	}
}

function diagnosticCodeToMarkerCode(
	code: Diagnostic["code"],
): string | undefined {
	return code === undefined ? undefined : String(code);
}

export function lspRangeToMonaco(range: Range): monaco.IRange {
	return {
		startLineNumber: range.start.line + 1,
		startColumn: range.start.character + 1,
		endLineNumber: range.end.line + 1,
		endColumn: range.end.character + 1,
	};
}

export function monacoPositionToLsp(position: monaco.IPosition): Position {
	return {
		line: position.lineNumber - 1,
		character: position.column - 1,
	};
}

export function diagnosticToMarker(
	diagnostic: Diagnostic,
): monaco.editor.IMarkerData {
	const range = lspRangeToMonaco(diagnostic.range);
	return {
		startLineNumber: range.startLineNumber,
		startColumn: range.startColumn,
		endLineNumber: range.endLineNumber,
		endColumn: range.endColumn,
		message: diagnostic.message,
		severity: severityToMarkerSeverity(diagnostic.severity),
		source: diagnostic.source,
		code: diagnosticCodeToMarkerCode(diagnostic.code),
	};
}

export function lspTextEditToMonaco(
	edit: TextEdit,
	model: monaco.editor.ITextModel,
): monaco.editor.IIdentifiedSingleEditOperation {
	const range = lspRangeToMonaco(edit.range);
	return {
		range: model.validateRange(range),
		text: edit.newText,
	};
}

export function monacoChangeToLspContentChange(change: {
	range: monaco.IRange;
	text: string;
}): { range: Range; text: string } {
	return {
		range: {
			start: {
				line: change.range.startLineNumber - 1,
				character: change.range.startColumn - 1,
			},
			end: {
				line: change.range.endLineNumber - 1,
				character: change.range.endColumn - 1,
			},
		},
		text: change.text,
	};
}

const COMPLETION_KIND_TEXT = 18;
const COMPLETION_KIND_VARIABLE = 4;
const COMPLETION_KIND_KEYWORD = 17;
const COMPLETION_KIND_FUNCTION = 1;

function completionKind(
	kind: CompletionItemKind | undefined,
): monaco.languages.CompletionItemKind {
	switch (kind) {
		case CompletionItemKind.Variable:
			return COMPLETION_KIND_VARIABLE;
		case CompletionItemKind.Keyword:
			return COMPLETION_KIND_KEYWORD;
		case CompletionItemKind.Function:
			return COMPLETION_KIND_FUNCTION;
		default:
			return COMPLETION_KIND_TEXT;
	}
}

const SYMBOL_KIND_VARIABLE = 12;
const SYMBOL_KIND_FUNCTION = 11;
const SYMBOL_KIND_NAMESPACE = 2;

function symbolKind(kind: SymbolKind): monaco.languages.SymbolKind {
	switch (kind) {
		case SymbolKind.Function:
			return SYMBOL_KIND_FUNCTION;
		case SymbolKind.Namespace:
			return SYMBOL_KIND_NAMESPACE;
		default:
			return SYMBOL_KIND_VARIABLE;
	}
}

export function markupToString(
	contents: string | MarkupContent | (string | MarkupContent)[],
): string {
	if (typeof contents === "string") return contents;
	if (Array.isArray(contents)) {
		return contents.map((entry) => markupToString(entry)).join("\n\n");
	}
	return contents.value;
}

export function lspCompletionItemToMonaco(
	item: CompletionItem,
	defaultRange: monaco.IRange,
): monaco.languages.CompletionItem {
	return {
		label: item.label,
		kind: completionKind(item.kind),
		insertText: item.insertText ?? item.label,
		detail: item.detail,
		documentation: item.documentation
			? markupToString(item.documentation)
			: undefined,
		range: defaultRange,
	};
}

function markedStringToMarkupInput(
	markedString: MarkedString,
): string | MarkupContent {
	return typeof markedString === "string"
		? markedString
		: "```" + markedString.language + "\n" + markedString.value + "\n```";
}

function hoverContentsToMarkupInput(
	contents: Hover["contents"],
): string | MarkupContent | (string | MarkupContent)[] {
	if (Array.isArray(contents)) {
		return contents.map((entry) => markedStringToMarkupInput(entry));
	}
	if (typeof contents === "string" || "kind" in contents) {
		return contents;
	}
	return markedStringToMarkupInput(contents);
}

export function lspHoverToMonaco(hover: Hover): monaco.languages.Hover {
	const value = markupToString(hoverContentsToMarkupInput(hover.contents));
	const range = hover.range ? lspRangeToMonaco(hover.range) : undefined;
	return {
		contents: [{ value }],
		range,
	};
}

export function lspLocationToMonaco(
	location: Location,
	uri: monaco.Uri,
): monaco.languages.Location {
	return {
		uri,
		range: lspRangeToMonaco(location.range),
	};
}

export function lspDocumentSymbolsToMonaco(
	symbols: DocumentSymbol[],
): monaco.languages.DocumentSymbol[] {
	return symbols.map((symbol) => ({
		name: symbol.name,
		detail: symbol.detail ?? "",
		kind: symbolKind(symbol.kind),
		tags: [],
		range: lspRangeToMonaco(symbol.range),
		selectionRange: lspRangeToMonaco(symbol.selectionRange),
		children: symbol.children
			? lspDocumentSymbolsToMonaco(symbol.children)
			: undefined,
	}));
}
