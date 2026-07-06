import type { UpdateElementPositionsParams } from "@sysdml/contracts";
import { describe, expect, it } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";

import { analyzeDocument } from "../../src/analysis.js";
import {
	computeElementPositionEdits,
	computeMissingPositionEdits,
} from "../../src/features/position-edit.js";

const URI = "file:///m.sysdml";

function applyPositions(
	source: string,
	positions: UpdateElementPositionsParams["positions"],
): string {
	const analysis = analyzeDocument(source);
	if (!analysis.ast) throw new Error("parse failed");
	const result = computeElementPositionEdits(analysis.ast, source, {
		uri: URI,
		positions,
	});
	if ("error" in result) throw new Error(result.error);
	const doc = TextDocument.create(URI, "sysdml", 1, source);
	return TextDocument.applyEdits(doc, result.edits);
}

function errorFor(
	source: string,
	positions: UpdateElementPositionsParams["positions"],
): string {
	const analysis = analyzeDocument(source);
	if (!analysis.ast) throw new Error("parse failed");
	const result = computeElementPositionEdits(analysis.ast, source, {
		uri: URI,
		positions,
	});
	if (!("error" in result)) throw new Error("expected an error");
	return result.error;
}

describe("computeElementPositionEdits", () => {
	it("replaces an existing stock position literal in place", () => {
		const source = `sfd m\nstock s {\n  init: 1\n  position: { x: 5, y: 6 }\n}`;
		expect(
			applyPositions(source, [{ id: "s", position: { x: 10, y: 20 } }]),
		).toBe(`sfd m\nstock s {\n  init: 1\n  position: { x: 10, y: 20 }\n}`);
	});

	it("inserts a position line into a multi-line stock block", () => {
		const source = `sfd m\nstock s {\n  init: 1\n}`;
		expect(
			applyPositions(source, [{ id: "s", position: { x: 10, y: 20 } }]),
		).toBe(`sfd m\nstock s {\n  init: 1\n  position: { x: 10, y: 20 }\n}`);
	});

	it("inserts inline into a single-line stock block", () => {
		const source = `sfd m\nstock s { init: 1 }`;
		expect(
			applyPositions(source, [{ id: "s", position: { x: 1, y: 2 } }]),
		).toBe(`sfd m\nstock s { init: 1 position: { x: 1, y: 2 } }`);
	});

	it("keeps a space before the inserted property when the block has none", () => {
		const source = `sfd m\nstock s { init: 1}`;
		expect(
			applyPositions(source, [{ id: "s", position: { x: 1, y: 2 } }]),
		).toBe(`sfd m\nstock s { init: 1 position: { x: 1, y: 2 } }`);
	});

	it("inserts a position line into a flow block after via", () => {
		const source = `sfd m\nflow f {\n  from: null\n  to: null\n  rate: 1\n  via: [{ x: 1, y: 2 }]\n}`;
		expect(
			applyPositions(source, [{ id: "f", position: { x: 3, y: 4 } }]),
		).toBe(
			`sfd m\nflow f {\n  from: null\n  to: null\n  rate: 1\n  via: [{ x: 1, y: 2 }]\n  position: { x: 3, y: 4 }\n}`,
		);
	});

	it("inserts a position line into a via-only flow block", () => {
		const source = `sfd m\nflow f {\n  via: [{ x: 1, y: 2 }]\n}`;
		expect(
			applyPositions(source, [{ id: "f", position: { x: 3, y: 4 } }]),
		).toBe(
			`sfd m\nflow f {\n  via: [{ x: 1, y: 2 }]\n  position: { x: 3, y: 4 }\n}`,
		);
	});

	it("appends a meta block to an aux with an expression", () => {
		const source = `sfd m\naux r = 0.5`;
		expect(
			applyPositions(source, [{ id: "r", position: { x: 7, y: 8 } }]),
		).toBe(`sfd m\naux r = 0.5 { position: { x: 7, y: 8 } }`);
	});

	it("replaces the position of an expression-less aux", () => {
		const source = `cld m\naux a { position: { x: 1, y: 2 } }\na ->+ b`;
		expect(
			applyPositions(source, [{ id: "a", position: { x: 9, y: 9 } }]),
		).toBe(`cld m\naux a { position: { x: 9, y: 9 } }\na ->+ b`);
	});

	it("creates aux declarations for unknown cld ids before the first connection", () => {
		const source = `cld m\n\na ->+ b`;
		expect(
			applyPositions(source, [
				{ id: "a", position: { x: 1, y: 2 } },
				{ id: "b", position: { x: 3, y: 4 } },
			]),
		).toBe(
			`cld m\n\naux a { position: { x: 1, y: 2 } }\naux b { position: { x: 3, y: 4 } }\n\na ->+ b`,
		);
	});

	it("creates aux declarations at end of file when no connections exist", () => {
		const source = `cld m\n\naux a { position: { x: 1, y: 2 } }`;
		expect(
			applyPositions(source, [{ id: "z", position: { x: 5, y: 6 } }]),
		).toBe(
			`cld m\n\naux a { position: { x: 1, y: 2 } }\n\naux z { position: { x: 5, y: 6 } }`,
		);
	});

	it("rejects unknown ids in sfd models", () => {
		expect(
			errorFor(`sfd m\nstock s { init: 1 }`, [
				{ id: "ghost", position: { x: 1, y: 2 } },
			]),
		).toBe("element 'ghost' not found");
	});

	it("rejects an empty batch", () => {
		expect(errorFor(`cld m\na ->+ b`, [])).toBe(
			"positions must be a non-empty array",
		);
	});

	it("rejects non-integer coordinates", () => {
		expect(
			errorFor(`cld m\na ->+ b`, [{ id: "a", position: { x: 1.5, y: 2 } }]),
		).toBe("position x and y for 'a' must be integers");
	});

	it("rejects unsafe-integer coordinates", () => {
		expect(
			errorFor(`cld m\na ->+ b`, [{ id: "a", position: { x: 1e21, y: 0 } }]),
		).toBe("position x and y for 'a' must be integers");
	});

	it("rejects duplicate ids in one batch", () => {
		expect(
			errorFor(`cld m\na ->+ b`, [
				{ id: "a", position: { x: 1, y: 2 } },
				{ id: "a", position: { x: 3, y: 4 } },
			]),
		).toBe("duplicate element id 'a' in positions");
	});

	it("rejects an id that is not a valid identifier", () => {
		expect(
			errorFor(`cld m\na ->+ b`, [
				{
					id: "x { position: { x: 0, y: 0 } }\naux evil",
					position: { x: 1, y: 2 },
				},
			]),
		).toBe(
			"position id 'x { position: { x: 0, y: 0 } }\naux evil' is not a valid identifier",
		);
	});
});

describe("computeMissingPositionEdits", () => {
	it("pins every missing element of a cld in one edit batch", () => {
		const source = `cld m\n\na ->+ b`;
		const analysis = analyzeDocument(source);
		if (!analysis.ast || !analysis.ir) throw new Error("analysis failed");
		const result = computeMissingPositionEdits(
			analysis.ast,
			analysis.ir,
			source,
			URI,
		);
		if ("error" in result) throw new Error(result.error);
		const doc = TextDocument.create(URI, "sysdml", 1, source);
		const applied = TextDocument.applyEdits(doc, result.edits);
		expect(applied).toMatch(/aux a \{ position: \{ x: -?\d+, y: -?\d+ \} \}/);
		expect(applied).toMatch(/aux b \{ position: \{ x: -?\d+, y: -?\d+ \} \}/);
		const reanalysis = analyzeDocument(applied);
		expect(reanalysis.ir).not.toBeNull();
		expect(
			computeMissingPositionEdits(
				reanalysis.ast!,
				reanalysis.ir!,
				applied,
				URI,
			),
		).toEqual({ edits: [] });
	});

	it("returns no edits when everything is positioned", () => {
		const source = `cld m\naux a { position: { x: 1, y: 2 } }\naux b { position: { x: 3, y: 4 } }\n\na ->+ b`;
		const analysis = analyzeDocument(source);
		if (!analysis.ast || !analysis.ir) throw new Error("analysis failed");
		expect(
			computeMissingPositionEdits(analysis.ast, analysis.ir, source, URI),
		).toEqual({ edits: [] });
	});

	it("never rewrites a positioned cld stock during auto-pinning", () => {
		const source = `cld m\n\nstock s {\n  init: 1\n  position: { x: 100, y: 100 }\n}\n\ns ->+ b`;
		const analysis = analyzeDocument(source);
		if (!analysis.ast || !analysis.ir) throw new Error("analysis failed");
		const result = computeMissingPositionEdits(
			analysis.ast,
			analysis.ir,
			source,
			URI,
		);
		if ("error" in result) throw new Error(result.error);
		const doc = TextDocument.create(URI, "sysdml", 1, source);
		const applied = TextDocument.applyEdits(doc, result.edits);
		expect(applied).toContain("position: { x: 100, y: 100 }");
		expect(applied).not.toMatch(/aux s /);
	});
});
