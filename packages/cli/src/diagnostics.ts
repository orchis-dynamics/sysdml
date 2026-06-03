import type { IRDiagnostic, Diagnostic as ParserDiagnostic } from "@sysdml/contracts";

export function formatDiagnosticBlock(lines: string[]): string {
	return (
		["--- Diagnostics ---", ...lines.map((line) => `  ${line}`)].join("\n") +
		"\n"
	);
}

export function formatParserDiagnostic(diagnostic: ParserDiagnostic): string {
	return `[${diagnostic.span.start.line}:${diagnostic.span.start.col}] ${diagnostic.message}`;
}

export function formatIRDiagnostic(diagnostic: IRDiagnostic): string {
	const location = diagnostic.span
		? `[${diagnostic.span.start.line}:${diagnostic.span.start.col}] `
		: "";
	return `${location}[${diagnostic.code}] ${diagnostic.message}`;
}
