import type { IR } from "@sysdml/contracts";
import { BUILTIN_FUNCTIONS } from "@sysdml/contracts";
import type { FileNode } from "@sysdml/contracts";
import {
	CompletionItem,
	CompletionItemKind,
} from "vscode-languageserver/node.js";
import type { Position } from "vscode-languageserver/node.js";

const TOP_LEVEL_KEYWORDS = ["sfd", "cld", "stock", "aux", "flow", "time", "gf"];
const GF_KIND_VALUES = ["linear", "extra", "step"];
const LAYOUT_KEYWORDS = ["position", "via", "angle"];

type CompletionContext =
	| "flow-endpoint"
	| "gf-kind"
	| "expression"
	| "block-key"
	| "top-level";

function detectContext(source: string, position: Position): CompletionContext {
	const lines = source.split("\n");
	const line = lines[position.line] ?? "";
	const textBefore = line.slice(0, position.character);

	// Match "from:" or "to:" with optional whitespace after the colon
	if (/\b(from|to)\s*:\s*$/.test(textBefore)) return "flow-endpoint";
	// Match "kind:" with optional whitespace after the colon
	if (/\bkind\s*:\s*$/.test(textBefore)) return "gf-kind";

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

function findEnclosingFlowId(
	source: string,
	position: Position,
): string | null {
	const lines = source.split("\n");
	const sourceUpToCursor = lines
		.slice(0, position.line)
		.concat(lines[position.line]?.slice(0, position.character) ?? "")
		.join("\n");

	const openBraces = (sourceUpToCursor.match(/{/g) ?? []).length;
	const closeBraces = (sourceUpToCursor.match(/}/g) ?? []).length;
	if (openBraces <= closeBraces) return null;

	const lastOpenBraceIndex = sourceUpToCursor.lastIndexOf("{");
	const headerBeforeBrace = sourceUpToCursor.slice(0, lastOpenBraceIndex);
	const flowHeaderMatch = /\bflow\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(
		headerBeforeBrace,
	);
	return flowHeaderMatch ? flowHeaderMatch[1] : null;
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

function getFlowIds(ast: FileNode | null): string[] {
	if (!ast) return [];
	return ast.decls
		.filter(
			(d): d is Extract<typeof d, { type: "FlowDeclaration" }> =>
				d.type === "FlowDeclaration",
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
	const context = detectContext(source, position);

	switch (context) {
		case "flow-endpoint": {
			const nullItem = CompletionItem.create("null");
			nullItem.kind = CompletionItemKind.Keyword;
			const stocks = getStockIds(ast).map((id) => {
				const item = CompletionItem.create(id);
				item.kind = CompletionItemKind.Variable;
				return item;
			});
			const flows = getFlowIds(ast).map((id) => {
				const item = CompletionItem.create(id);
				item.kind = CompletionItemKind.Variable;
				return item;
			});
			return [nullItem, ...stocks, ...flows];
		}
		case "gf-kind":
			return GF_KIND_VALUES.map((v) => {
				const item = CompletionItem.create(v);
				item.kind = CompletionItemKind.EnumMember;
				return item;
			});
		case "block-key":
			return LAYOUT_KEYWORDS.map((kw) => {
				const item = CompletionItem.create(kw);
				item.kind = CompletionItemKind.Keyword;
				return item;
			});
		case "expression": {
			const enclosingFlowId = findEnclosingFlowId(source, position);
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
