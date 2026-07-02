import type { DocumentAnalysis } from "./analysis.js";

const latestAnalysisByUri = new Map<string, DocumentAnalysis>();
const lastParsedAnalysisByUri = new Map<string, DocumentAnalysis>();

export function getAnalysis(uri: string): DocumentAnalysis | null {
	return latestAnalysisByUri.get(uri) ?? null;
}

export function getLastParsedAnalysis(uri: string): DocumentAnalysis | null {
	return lastParsedAnalysisByUri.get(uri) ?? null;
}

export function setAnalysis(uri: string, analysis: DocumentAnalysis): void {
	latestAnalysisByUri.set(uri, analysis);
	if (analysis.ast) {
		lastParsedAnalysisByUri.set(uri, analysis);
	}
}

export function deleteAnalysis(uri: string): void {
	latestAnalysisByUri.delete(uri);
	lastParsedAnalysisByUri.delete(uri);
}
