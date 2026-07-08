import type * as monaco from "monaco-editor";
import { DiagnosticSeverity } from "vscode-languageserver-protocol";
import type {
	Diagnostic,
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

export function monacoChangeToLspContentChange(
	change: monaco.editor.IModelContentChange,
): { range: Range; text: string } {
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
