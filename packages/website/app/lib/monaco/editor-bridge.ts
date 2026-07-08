import type * as monaco from "monaco-editor";
import type { Diagnostic } from "vscode-languageserver-protocol";

import { diagnosticToMarker, lspTextEditToMonaco } from "../lsp/adapters";
import type { MediatorModel, MonacoBridge } from "../playground-mediator";
import { SYSDML_LANGUAGE_ID } from "./sysdml-language";

export interface EditableModel {
	getVersionId(): number;
	pushEditOperations(
		beforeCursorState: monaco.Selection[] | null,
		editOperations: monaco.languages.TextEdit[],
		cursorStateComputer: () => null,
	): monaco.Selection[] | null;
}

type AssertRealModelIsEditable =
	monaco.editor.ITextModel extends EditableModel ? true : never;
const assertRealModelIsEditable: AssertRealModelIsEditable = true;
void assertRealModelIsEditable;

export function applyEditsIfVersionMatches(
	model: EditableModel,
	edits: monaco.languages.TextEdit[],
	expectedVersion: number,
): boolean {
	if (model.getVersionId() !== expectedVersion) return false;
	model.pushEditOperations([], edits, () => null);
	return true;
}

export function makeMediatorModel(
	model: monaco.editor.ITextModel,
): MediatorModel {
	return {
		getValue: () => model.getValue(),
		getVersionId: () => model.getVersionId(),
		onDidChangeContent: (handler) =>
			model.onDidChangeContent((event) => handler(event)),
	};
}

export function makeMonacoBridge(
	model: monaco.editor.ITextModel,
	monacoApi: typeof import("monaco-editor"),
): MonacoBridge {
	return {
		setMarkers: (diagnostics: Diagnostic[]) => {
			monacoApi.editor.setModelMarkers(
				model,
				SYSDML_LANGUAGE_ID,
				diagnostics.map((diagnostic) => diagnosticToMarker(diagnostic)),
			);
		},
		applyEdits: (edits, expectedVersion) =>
			applyEditsIfVersionMatches(
				model,
				edits.map((edit) => lspTextEditToMonaco(edit, model)),
				expectedVersion,
			),
	};
}
