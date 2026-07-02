import type { FileNode } from "@sysdml/contracts";
import { Location } from "vscode-languageserver/node.js";
import type { Position } from "vscode-languageserver/node.js";

import { spanToRange } from "../analysis.js";
import { findIdentAtPosition } from "../ast-utils.js";

export function getDefinitionLocation(
	ast: FileNode,
	uri: string,
	position: Position,
): Location | null {
	const identName = findIdentAtPosition(ast, position);
	if (!identName) return null;

	for (const decl of ast.decls) {
		if (
			(decl.type === "StockDeclaration" ||
				decl.type === "AuxiliaryDeclaration" ||
				decl.type === "FlowDeclaration" ||
				decl.type === "GraphicalFunctionDeclaration") &&
			decl.id === identName
		) {
			return Location.create(uri, spanToRange(decl.idSpan));
		}
	}
	return null;
}
