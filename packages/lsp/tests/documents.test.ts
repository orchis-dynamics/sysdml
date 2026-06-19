import { describe, it, expect } from "vitest";

import { analyzeDocument } from "../src/analysis.js";
import {
	setAnalysis,
	getAnalysis,
	getLastParsedAnalysis,
	deleteAnalysis,
} from "../src/documents.js";

const PARSEABLE_SOURCE = `sfd m
stock population { init: 100 }
`;

const UNPARSEABLE_SOURCE = `sfd m
stock population { init: `;

describe("getLastParsedAnalysis", () => {
	it("keeps the last analysis whose source parsed when newer source fails", () => {
		const uri = "file:///keeps-last-good.sysdml";
		setAnalysis(uri, analyzeDocument(PARSEABLE_SOURCE));
		setAnalysis(uri, analyzeDocument(UNPARSEABLE_SOURCE));

		expect(getAnalysis(uri)?.ast).toBeNull();

		const lastParsed = getLastParsedAnalysis(uri);
		expect(lastParsed?.ast).not.toBeNull();
		expect(
			lastParsed?.ast?.decls.some((decl) => decl.type === "StockDeclaration"),
		).toBe(true);

		deleteAnalysis(uri);
	});

	it("returns null when nothing parseable was ever stored", () => {
		const uri = "file:///never-parsed.sysdml";
		setAnalysis(uri, analyzeDocument(UNPARSEABLE_SOURCE));
		expect(getLastParsedAnalysis(uri)).toBeNull();
		deleteAnalysis(uri);
	});

	it("returns null after the document is deleted", () => {
		const uri = "file:///deleted.sysdml";
		setAnalysis(uri, analyzeDocument(PARSEABLE_SOURCE));
		deleteAnalysis(uri);
		expect(getLastParsedAnalysis(uri)).toBeNull();
	});
});
