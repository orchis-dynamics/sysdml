import type * as monaco from "monaco-editor";
import { describe, expect, test, vi } from "vitest";

import {
	applyEditsIfVersionMatches,
	type EditableModel,
} from "../app/lib/monaco/editor-bridge";

function makeModel(currentVersion: number) {
	const pushEditOperations = vi.fn(
		(
			_beforeCursorState: monaco.Selection[] | null,
			_editOperations: monaco.languages.TextEdit[],
			_cursorStateComputer: () => null,
		): monaco.Selection[] | null => null,
	);
	const model: EditableModel = {
		getVersionId: () => currentVersion,
		pushEditOperations,
	};
	return { model, pushEditOperations };
}

const edits: monaco.languages.TextEdit[] = [
	{
		range: {
			startLineNumber: 1,
			startColumn: 1,
			endLineNumber: 1,
			endColumn: 1,
		},
		text: "x",
	},
];

describe("applyEditsIfVersionMatches", () => {
	test("applies the edits and returns true when the version matches", () => {
		const { model, pushEditOperations } = makeModel(5);
		const applied = applyEditsIfVersionMatches(model, edits, 5);
		expect(applied).toBe(true);
		expect(pushEditOperations).toHaveBeenCalledTimes(1);
	});

	test("skips the edits and returns false when the version differs", () => {
		const { model, pushEditOperations } = makeModel(5);
		const applied = applyEditsIfVersionMatches(model, edits, 4);
		expect(applied).toBe(false);
		expect(pushEditOperations).not.toHaveBeenCalled();
	});
});
