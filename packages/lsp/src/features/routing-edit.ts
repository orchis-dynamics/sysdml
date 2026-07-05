import type {
	ConnectionDeclarationNode,
	FileNode,
	IRPosition,
	Span,
	UpdateConnectionRoutingParams,
} from "@sysdml/contracts";
import { Position, TextEdit } from "vscode-languageserver/node.js";

import { spanToRange } from "../analysis.js";

export type RoutingEditResult = { edits: TextEdit[] } | { error: string };

const POLARITY_ARROWS = { "+": "->+", "-": "->-", "=>": "=>" } as const;

function findConnection(
	ast: FileNode,
	params: UpdateConnectionRoutingParams,
): ConnectionDeclarationNode | null {
	let remaining = params.connection.occurrence;
	for (const decl of ast.decls) {
		if (decl.type !== "ConnectionDeclaration") continue;
		if (
			decl.from !== params.connection.from ||
			decl.polarity !== params.connection.polarity ||
			decl.to !== params.connection.to
		) {
			continue;
		}
		if (remaining === 0) return decl;
		remaining--;
	}
	return null;
}

function positionAfterSpanEnd(span: Span): Position {
	return Position.create(span.end.line - 1, span.end.col);
}

function lineLeadingWhitespace(sourceText: string, line: number): string {
	const lineText = sourceText.split("\n")[line - 1] ?? "";
	return /^[ \t]*/.exec(lineText)?.[0] ?? "";
}

function angleEdit(
	decl: ConnectionDeclarationNode,
	sourceText: string,
	angle: number,
): TextEdit {
	const propertyText = `angle: ${angle}`;
	if (decl.angleSpan) {
		return TextEdit.replace(spanToRange(decl.angleSpan), propertyText);
	}
	if (decl.viaSpan) {
		const insertAt = positionAfterSpanEnd(decl.viaSpan);
		if (decl.viaSpan.end.line === decl.span.end.line) {
			return TextEdit.insert(insertAt, ` ${propertyText}`);
		}
		const indent = lineLeadingWhitespace(sourceText, decl.viaSpan.start.line);
		return TextEdit.insert(insertAt, `\n${indent}${propertyText}`);
	}
	return TextEdit.insert(
		positionAfterSpanEnd(decl.toSpan),
		` { ${propertyText} }`,
	);
}

export function computeConnectionRoutingEdits(
	ast: FileNode,
	sourceText: string,
	params: UpdateConnectionRoutingParams,
): RoutingEditResult {
	const decl = findConnection(ast, params);
	if (!decl) {
		const arrow = POLARITY_ARROWS[params.connection.polarity];
		return {
			error: `connection '${params.connection.from} ${arrow} ${params.connection.to}' not found`,
		};
	}
	const edits: TextEdit[] = [];
	if (params.via !== undefined) {
		if (!decl.viaSpan) {
			return { error: "connection has no via property to update" };
		}
		edits.push(
			TextEdit.replace(spanToRange(decl.viaSpan), viaText(params.via)),
		);
	}
	if (params.angle !== undefined) {
		edits.push(angleEdit(decl, sourceText, params.angle));
	}
	if (edits.length === 0) {
		return { error: "routing edit carries no changes" };
	}
	return { edits };
}

function viaText(via: IRPosition): string {
	return `via: { x: ${via.x}, y: ${via.y} }`;
}
