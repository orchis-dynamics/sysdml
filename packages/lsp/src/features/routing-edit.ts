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
const VALID_POLARITIES = new Set(Object.keys(POLARITY_ARROWS));
const MAX_ANGLE_MAGNITUDE_DEGREES = 180;

function invalidParamsError(
	params: UpdateConnectionRoutingParams,
): string | null {
	const { connection } = params;
	if (typeof connection.from !== "string" || connection.from.length === 0) {
		return "connection.from must be a non-empty string";
	}
	if (typeof connection.to !== "string" || connection.to.length === 0) {
		return "connection.to must be a non-empty string";
	}
	if (!VALID_POLARITIES.has(connection.polarity)) {
		return "connection.polarity must be one of '+', '-', '=>'";
	}
	if (
		typeof connection.occurrence !== "number" ||
		!Number.isInteger(connection.occurrence) ||
		connection.occurrence < 0
	) {
		return "connection.occurrence must be a non-negative integer";
	}
	if (params.angle !== undefined) {
		if (
			typeof params.angle !== "number" ||
			!Number.isInteger(params.angle) ||
			Math.abs(params.angle) > MAX_ANGLE_MAGNITUDE_DEGREES
		) {
			return "angle must be an integer between -180 and 180";
		}
	}
	if (params.via !== undefined) {
		if (
			typeof params.via.x !== "number" ||
			!Number.isInteger(params.via.x) ||
			typeof params.via.y !== "number" ||
			!Number.isInteger(params.via.y)
		) {
			return "via.x and via.y must be integers";
		}
	}
	return null;
}

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
	const invalidParams = invalidParamsError(params);
	if (invalidParams) return { error: invalidParams };
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
