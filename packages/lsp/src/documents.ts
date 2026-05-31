import type { DocumentAnalysis } from "./analysis.js";

const cache = new Map<string, DocumentAnalysis>();

export function getAnalysis(uri: string): DocumentAnalysis | null {
	return cache.get(uri) ?? null;
}

export function setAnalysis(uri: string, analysis: DocumentAnalysis): void {
	cache.set(uri, analysis);
}

export function deleteAnalysis(uri: string): void {
	cache.delete(uri);
}
