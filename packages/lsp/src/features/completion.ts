import type { BlockKeywordKind, FileNode, IR } from "@sysdml/contracts";
import {
	BLOCK_PROPERTY_KEYWORDS,
	BUILTIN_FUNCTIONS,
	TOP_LEVEL_KEYWORDS,
} from "@sysdml/contracts";
import {
	CompletionItem,
	CompletionItemKind,
} from "vscode-languageserver/node.js";
import type { Position } from "vscode-languageserver/node.js";

const GF_KIND_VALUES = ["linear", "extra", "step"];
const TIME_METHOD_VALUES = ["euler", "rk4", "rk2"];

type CompletionContext =
	| "flow-endpoint"
	| "gf-kind"
	| "time-method"
	| "expression"
	| "block-key"
	| "top-level";

function replaceCommentsWithSpaces(source: string): string {
	const characters = source.split("");
	let index = 0;
	while (index < source.length) {
		const current = source[index];
		const next = source[index + 1];
		const isLineComment = current === "#" || (current === "/" && next === "/");
		const isBlockCommentStart = current === "/" && next === "*";
		if (isLineComment) {
			while (index < source.length && source[index] !== "\n") {
				characters[index] = " ";
				index += 1;
			}
		} else if (isBlockCommentStart) {
			characters[index] = " ";
			characters[index + 1] = " ";
			index += 2;
			while (
				index < source.length &&
				!(source[index] === "*" && source[index + 1] === "/")
			) {
				if (source[index] !== "\n") characters[index] = " ";
				index += 1;
			}
			if (index < source.length) {
				characters[index] = " ";
				characters[index + 1] = " ";
				index += 2;
			}
		} else {
			index += 1;
		}
	}
	return characters.join("");
}

function detectContext(source: string, position: Position): CompletionContext {
	const lines = source.split("\n");
	const line = lines[position.line] ?? "";
	const textBefore = line.slice(0, position.character);

	// Match "from:" or "to:" with optional whitespace after the colon
	if (/\b(from|to)\s*:\s*$/.test(textBefore)) return "flow-endpoint";
	// Match "kind:" with optional whitespace after the colon
	if (/\bkind\s*:\s*$/.test(textBefore)) return "gf-kind";
	if (/\bmethod\s*:\s*$/.test(textBefore)) return "time-method";

	// Check if we're inside a block by counting braces before this position
	const sourceUpToCursor = lines
		.slice(0, position.line)
		.concat(lines[position.line]?.slice(0, position.character) ?? "")
		.join("\n");
	const openBraces = (sourceUpToCursor.match(/{/g) ?? []).length;
	const closeBraces = (sourceUpToCursor.match(/}/g) ?? []).length;
	if (openBraces > closeBraces) {
		const textBeforeTrimmed = textBefore.trimStart();
		if (!textBeforeTrimmed.includes(":")) return "block-key";
		return "expression";
	}

	return "top-level";
}

function findLastUnmatchedOpenBraceIndex(text: string): number | null {
	const openBraceIndices: number[] = [];
	for (let index = 0; index < text.length; index += 1) {
		if (text[index] === "{") openBraceIndices.push(index);
		else if (text[index] === "}") openBraceIndices.pop();
	}
	const lastUnmatchedIndex = openBraceIndices.at(-1);
	return lastUnmatchedIndex === undefined ? null : lastUnmatchedIndex;
}

function headerBeforeEnclosingBlock(
	source: string,
	position: Position,
): string | null {
	const lines = source.split("\n");
	const sourceUpToCursor = lines
		.slice(0, position.line)
		.concat(lines[position.line]?.slice(0, position.character) ?? "")
		.join("\n");
	const braceIndex = findLastUnmatchedOpenBraceIndex(sourceUpToCursor);
	if (braceIndex === null) return null;
	return sourceUpToCursor.slice(0, braceIndex);
}

function findEnclosingFlowId(
	source: string,
	position: Position,
): string | null {
	const header = headerBeforeEnclosingBlock(source, position);
	if (header === null) return null;
	const flowHeaderMatch = /\bflow\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(header);
	return flowHeaderMatch ? flowHeaderMatch[1] : null;
}

function findEnclosingBlockKind(
	source: string,
	position: Position,
): BlockKeywordKind | null {
	const header = headerBeforeEnclosingBlock(source, position);
	if (header === null) return null;
	if (/\bstock\s+[A-Za-z_][A-Za-z0-9_]*\s*$/.test(header)) return "stock";
	if (/\bflow\s+[A-Za-z_][A-Za-z0-9_]*\s*$/.test(header)) return "flow";
	if (/\bgf\s+[A-Za-z_][A-Za-z0-9_]*\s*$/.test(header)) return "gf";
	if (/\btime\s*$/.test(header)) return "time";
	if (/(->\+|->-|=>)\s*[A-Za-z_][A-Za-z0-9_]*\s*$/.test(header)) {
		return "connection";
	}
	if (/\baux\s+[A-Za-z_][A-Za-z0-9_]*\s*=[^{}]*$/.test(header)) return "aux";
	return null;
}

function getStockIds(ast: FileNode | null): string[] {
	if (!ast) return [];
	return ast.decls
		.filter(
			(d): d is Extract<typeof d, { type: "StockDeclaration" }> =>
				d.type === "StockDeclaration",
		)
		.map((d) => d.id);
}

function getAllUserIds(ast: FileNode | null, ir: IR | null): string[] {
	if (ir) {
		return [
			...ir.stocks.map((s) => s.id),
			...ir.auxiliaries.map((a) => a.id),
			...ir.flows.map((f) => f.id),
		];
	}
	if (!ast) return [];
	return ast.decls
		.filter(
			(d): d is Extract<typeof d, { id: string }> =>
				d.type === "StockDeclaration" ||
				d.type === "AuxiliaryDeclaration" ||
				d.type === "FlowDeclaration",
		)
		.map((d) => d.id);
}

function getConnectedVariableIds(flowId: string, ir: IR | null): Set<string> {
	const connectedIds = new Set<string>();
	if (!ir) return connectedIds;

	const flow = ir.flows.find((f) => f.id === flowId);
	if (flow) {
		if (flow.from) connectedIds.add(flow.from);
		if (flow.to) connectedIds.add(flow.to);
	}

	for (const connection of ir.connections) {
		if (connection.from === flowId) connectedIds.add(connection.to);
		if (connection.to === flowId) connectedIds.add(connection.from);
	}

	return connectedIds;
}

export function getCompletionItems(
	source: string,
	ast: FileNode | null,
	ir: IR | null,
	position: Position,
): CompletionItem[] {
	const maskedSource = replaceCommentsWithSpaces(source);
	const context = detectContext(maskedSource, position);

	switch (context) {
		case "flow-endpoint": {
			const nullItem = CompletionItem.create("null");
			nullItem.kind = CompletionItemKind.Keyword;
			const stocks = getStockIds(ast).map((id) => {
				const item = CompletionItem.create(id);
				item.kind = CompletionItemKind.Variable;
				return item;
			});
			return [nullItem, ...stocks];
		}
		case "gf-kind":
			return GF_KIND_VALUES.map((v) => {
				const item = CompletionItem.create(v);
				item.kind = CompletionItemKind.EnumMember;
				return item;
			});
		case "time-method":
			return TIME_METHOD_VALUES.map((v) => {
				const item = CompletionItem.create(v);
				item.kind = CompletionItemKind.EnumMember;
				return item;
			});
		case "block-key": {
			const blockKind = findEnclosingBlockKind(maskedSource, position);
			if (blockKind === null) return [];
			return BLOCK_PROPERTY_KEYWORDS[blockKind].map((key) => {
				const item = CompletionItem.create(key);
				item.kind = CompletionItemKind.Keyword;
				return item;
			});
		}
		case "expression": {
			const enclosingFlowId = findEnclosingFlowId(maskedSource, position);
			const connectedIds = enclosingFlowId
				? getConnectedVariableIds(enclosingFlowId, ir)
				: new Set<string>();

			const userIds = getAllUserIds(ast, ir).map((id) => {
				const item = CompletionItem.create(id);
				item.kind = CompletionItemKind.Variable;
				item.sortText = connectedIds.has(id) ? `0_${id}` : `1_${id}`;
				return item;
			});
			const builtins = Array.from(BUILTIN_FUNCTIONS).map((name) => {
				const item = CompletionItem.create(name);
				item.kind = CompletionItemKind.Function;
				item.sortText = `2_${name}`;
				return item;
			});
			return [...userIds, ...builtins];
		}
		case "top-level":
			return TOP_LEVEL_KEYWORDS.map((kw) => {
				const item = CompletionItem.create(kw);
				item.kind = CompletionItemKind.Keyword;
				return item;
			});
	}
}
