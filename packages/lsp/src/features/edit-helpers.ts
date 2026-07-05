import type { Span } from "@sysdml/contracts";
import { Position } from "vscode-languageserver/node.js";

export function positionAfterSpanEnd(span: Span): Position {
	return Position.create(span.end.line - 1, span.end.col);
}

export function lineLeadingWhitespace(
	sourceText: string,
	line: number,
): string {
	const lineText = sourceText.split("\n")[line - 1] ?? "";
	return /^[ \t]*/.exec(lineText)?.[0] ?? "";
}
