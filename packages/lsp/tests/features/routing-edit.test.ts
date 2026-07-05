import type { UpdateConnectionRoutingParams } from "@sysdml/contracts";
import { describe, expect, it } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";

import { analyzeDocument } from "../../src/analysis.js";
import { computeConnectionRoutingEdits } from "../../src/features/routing-edit.js";

const URI = "file:///m.sysdml";

function routingParams(
	overrides: Omit<Partial<UpdateConnectionRoutingParams>, "connection"> & {
		connection?: Partial<UpdateConnectionRoutingParams["connection"]>;
	},
): UpdateConnectionRoutingParams {
	return {
		uri: URI,
		...overrides,
		connection: {
			from: "a",
			polarity: "+",
			to: "b",
			occurrence: 0,
			...overrides.connection,
		},
	};
}

function applyRouting(
	source: string,
	params: UpdateConnectionRoutingParams,
): string {
	const analysis = analyzeDocument(source);
	if (!analysis.ast) throw new Error("parse failed");
	const result = computeConnectionRoutingEdits(analysis.ast, source, params);
	if ("error" in result) throw new Error(result.error);
	const doc = TextDocument.create(URI, "sysdml", 1, source);
	return TextDocument.applyEdits(doc, result.edits);
}

describe("computeConnectionRoutingEdits", () => {
	it("replaces an existing angle value in place", () => {
		const source = `sfd m\na ->+ b { angle: 45 }`;
		expect(applyRouting(source, routingParams({ angle: -90 }))).toBe(
			`sfd m\na ->+ b { angle: -90 }`,
		);
	});

	it("preserves odd whitespace around an angle replacement", () => {
		const source = `sfd m\na ->+ b {   angle:   45   }`;
		expect(applyRouting(source, routingParams({ angle: 15 }))).toBe(
			`sfd m\na ->+ b {   angle: 15   }`,
		);
	});

	it("appends a block to a bare connection", () => {
		const source = `sfd m\na ->+ b`;
		expect(applyRouting(source, routingParams({ angle: 30 }))).toBe(
			`sfd m\na ->+ b { angle: 30 }`,
		);
	});

	it("inserts angle inline after via in a single-line block", () => {
		const source = `sfd m\na ->+ b { via: { x: 1, y: 2 } }`;
		expect(applyRouting(source, routingParams({ angle: 30 }))).toBe(
			`sfd m\na ->+ b { via: { x: 1, y: 2 } angle: 30 }`,
		);
	});

	it("inserts angle on its own line in a multiline block", () => {
		const source = `sfd m\na ->+ b {\n  via: { x: 1, y: 2 }\n}`;
		expect(applyRouting(source, routingParams({ angle: 30 }))).toBe(
			`sfd m\na ->+ b {\n  via: { x: 1, y: 2 }\n  angle: 30\n}`,
		);
	});

	it("replaces via in place", () => {
		const source = `sfd m\na ->+ b { via: { x: 1, y: 2 } }`;
		expect(
			applyRouting(source, routingParams({ via: { x: 150, y: 200 } })),
		).toBe(`sfd m\na ->+ b { via: { x: 150, y: 200 } }`);
	});

	it("rewrites via and angle together", () => {
		const source = `sfd m\na ->+ b { angle: 45 via: { x: 1, y: 2 } }`;
		expect(
			applyRouting(source, routingParams({ angle: 60, via: { x: 9, y: 8 } })),
		).toBe(`sfd m\na ->+ b { angle: 60 via: { x: 9, y: 8 } }`);
	});

	it("targets the requested occurrence among duplicate triples", () => {
		const source = `sfd m\na ->+ b { angle: 10 }\na ->+ b { angle: 20 }`;
		expect(
			applyRouting(
				source,
				routingParams({ angle: 99, connection: { occurrence: 1 } }),
			),
		).toBe(`sfd m\na ->+ b { angle: 10 }\na ->+ b { angle: 99 }`);
	});

	it("edits flow-link (=>) connections", () => {
		const source = `sfd m\na => b`;
		expect(
			applyRouting(
				source,
				routingParams({ angle: 25, connection: { polarity: "=>" } }),
			),
		).toBe(`sfd m\na => b { angle: 25 }`);
	});

	it("errors when the connection is not found", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ angle: 30, connection: { to: "zzz" } }),
		);
		expect(result).toHaveProperty("error");
	});

	it("errors when asked to write via to a connection without one", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ via: { x: 1, y: 2 } }),
		);
		expect(result).toHaveProperty("error");
	});

	it("errors when the edit carries no changes", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({}),
		);
		expect(result).toHaveProperty("error");
	});

	it("errors on a non-integer angle", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ angle: 45.5 }),
		);
		expect(result).toHaveProperty("error");
		expect(result).not.toHaveProperty("edits");
	});

	it("errors on an out-of-range angle", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ angle: 181 }),
		);
		expect(result).toHaveProperty("error");
		expect(result).not.toHaveProperty("edits");
	});

	it("errors on a non-numeric angle", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ angle: "45" as unknown as number }),
		);
		expect(result).toHaveProperty("error");
		expect(result).not.toHaveProperty("edits");
	});

	it("errors on a fractional via coordinate", () => {
		const source = `sfd m\na ->+ b { via: { x: 1, y: 2 } }`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ via: { x: 1.5, y: 2 } }),
		);
		expect(result).toHaveProperty("error");
		expect(result).not.toHaveProperty("edits");
	});

	it("errors on a negative occurrence", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ angle: 30, connection: { occurrence: -1 } }),
		);
		expect(result).toHaveProperty("error");
		expect(result).not.toHaveProperty("edits");
	});

	it("errors on an invalid polarity", () => {
		const source = `sfd m\na ->+ b`;
		const analysis = analyzeDocument(source);
		const result = computeConnectionRoutingEdits(
			analysis.ast!,
			source,
			routingParams({ angle: 30, connection: { polarity: "~" as never } }),
		);
		expect(result).toHaveProperty("error");
		expect(result).not.toHaveProperty("edits");
	});
});
