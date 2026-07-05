import type {
	AuxiliaryDeclarationNode,
	ElementPositionEdit,
	FileNode,
	FlowDeclarationNode,
	IRPosition,
	Span,
	StockDeclarationNode,
	UpdateElementPositionsParams,
} from "@sysdml/contracts";
import { Position, TextEdit } from "vscode-languageserver/node.js";

import { spanToRange } from "../analysis.js";
import { lineLeadingWhitespace, positionAfterSpanEnd } from "./edit-helpers.js";

export type PositionEditResult = { edits: TextEdit[] } | { error: string };

type PositionedDeclaration =
	| StockDeclarationNode
	| FlowDeclarationNode
	| AuxiliaryDeclarationNode;

function invalidParamsError(
	params: UpdateElementPositionsParams,
): string | null {
	if (!Array.isArray(params.positions) || params.positions.length === 0) {
		return "positions must be a non-empty array";
	}
	const seen = new Set<string>();
	for (const entry of params.positions) {
		if (typeof entry.id !== "string" || entry.id.length === 0) {
			return "position id must be a non-empty string";
		}
		if (seen.has(entry.id)) {
			return `duplicate element id '${entry.id}' in positions`;
		}
		seen.add(entry.id);
		if (
			typeof entry.position?.x !== "number" ||
			!Number.isInteger(entry.position.x) ||
			typeof entry.position?.y !== "number" ||
			!Number.isInteger(entry.position.y)
		) {
			return `position x and y for '${entry.id}' must be integers`;
		}
	}
	return null;
}

function declarationsById(ast: FileNode): Map<string, PositionedDeclaration> {
	const byId = new Map<string, PositionedDeclaration>();
	for (const decl of ast.decls) {
		if (
			(decl.type === "StockDeclaration" ||
				decl.type === "FlowDeclaration" ||
				decl.type === "AuxiliaryDeclaration") &&
			!byId.has(decl.id)
		) {
			byId.set(decl.id, decl);
		}
	}
	return byId;
}

function posText(position: IRPosition): string {
	return `{ x: ${position.x}, y: ${position.y} }`;
}

function blockInsertEdit(
	decl: StockDeclarationNode | FlowDeclarationNode,
	sourceText: string,
	position: IRPosition,
): TextEdit {
	const propertyText = `position: ${posText(position)}`;
	if (decl.span.start.line === decl.span.end.line) {
		return TextEdit.insert(
			Position.create(decl.span.end.line - 1, decl.span.end.col - 1),
			`${propertyText} `,
		);
	}
	const indent = lineLeadingWhitespace(sourceText, decl.props[0].span.start.line);
	return TextEdit.insert(
		Position.create(decl.span.end.line - 1, 0),
		`${indent}${propertyText}\n`,
	);
}

function editForDeclaration(
	decl: PositionedDeclaration,
	sourceText: string,
	position: IRPosition,
): TextEdit {
	if (decl.position) {
		return TextEdit.replace(spanToRange(decl.position.span), posText(position));
	}
	if (decl.type === "AuxiliaryDeclaration") {
		return TextEdit.insert(
			positionAfterSpanEnd(decl.span),
			` { position: ${posText(position)} }`,
		);
	}
	return blockInsertEdit(decl, sourceText, position);
}

function creationInsertEdit(
	ast: FileNode,
	creations: ElementPositionEdit[],
): TextEdit {
	const lines = creations
		.map(
			(creation) => `aux ${creation.id} { position: ${posText(creation.position)} }`,
		)
		.join("\n");
	const firstConnection = ast.decls.find(
		(decl) => decl.type === "ConnectionDeclaration",
	);
	if (firstConnection) {
		return TextEdit.insert(
			Position.create(firstConnection.span.start.line - 1, 0),
			`${lines}\n\n`,
		);
	}
	const lastDecl = ast.decls.at(-1);
	const anchorSpan: Span = lastDecl ? lastDecl.span : ast.model.span;
	return TextEdit.insert(positionAfterSpanEnd(anchorSpan), `\n\n${lines}`);
}

export function computeElementPositionEdits(
	ast: FileNode,
	sourceText: string,
	params: UpdateElementPositionsParams,
): PositionEditResult {
	const invalidParams = invalidParamsError(params);
	if (invalidParams) return { error: invalidParams };
	const byId = declarationsById(ast);
	const edits: TextEdit[] = [];
	const creations: ElementPositionEdit[] = [];
	for (const entry of params.positions) {
		const decl = byId.get(entry.id);
		if (!decl) {
			if (ast.model.kind === "cld") {
				creations.push(entry);
				continue;
			}
			return { error: `element '${entry.id}' not found` };
		}
		edits.push(editForDeclaration(decl, sourceText, entry.position));
	}
	if (creations.length > 0) edits.push(creationInsertEdit(ast, creations));
	return { edits };
}
