import {
  CompletionItem,
  CompletionItemKind,
} from "vscode-languageserver/node.js";
import type { FileNode } from "@sysdml/parser";
import type { IR } from "@sysdml/ir";
import { BUILTIN_FUNCTIONS } from "@sysdml/ir";
import type { Position } from "vscode-languageserver/node.js";

const TOP_LEVEL_KEYWORDS = ["model", "stock", "aux", "flow", "time", "gf"];
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

function getStockIds(ast: FileNode | null): string[] {
  if (!ast) return [];
  return ast.decls
    .filter((d): d is Extract<typeof d, { type: "StockDeclaration" }> => d.type === "StockDeclaration")
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

export function getCompletionItems(
  source: string,
  ast: FileNode | null,
  ir: IR | null,
  position: Position,
): CompletionItem[] {
  const context = detectContext(source, position);

  switch (context) {
    case "flow-endpoint": {
      const stocks = getStockIds(ast).map((id) => CompletionItem.create(id));
      const nullItem = CompletionItem.create("null");
      nullItem.kind = CompletionItemKind.Keyword;
      return [nullItem, ...stocks];
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
      const userIds = getAllUserIds(ast, ir).map((id) => {
        const item = CompletionItem.create(id);
        item.kind = CompletionItemKind.Variable;
        return item;
      });
      const builtins = Array.from(BUILTIN_FUNCTIONS).map((name) => {
        const item = CompletionItem.create(name);
        item.kind = CompletionItemKind.Function;
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
