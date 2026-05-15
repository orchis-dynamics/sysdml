import { Hover, MarkupKind } from "vscode-languageserver/node.js";
import type { FileNode } from "@sysdml/parser";
import type { IR, IRExprNode, IRPosition } from "@sysdml/ir";
import type { Position } from "vscode-languageserver/node.js";
import { BUILTIN_ARITY } from "@sysdml/ir";
import { findIdentAtPosition } from "../ast-utils.js";

export function getHoverContent(
  ast: FileNode,
  ir: IR | null,
  position: Position,
): Hover | null {
  const identName = findIdentAtPosition(ast, position);
  if (!identName) return null;

  const content = buildHoverContent(identName, ast, ir);
  if (!content) return null;

  return {
    contents: { kind: MarkupKind.Markdown, value: content },
  };
}

function buildHoverContent(
  name: string,
  ast: FileNode,
  ir: IR | null,
): string | null {
  for (const decl of ast.decls) {
    switch (decl.type) {
      case "StockDecl":
        if (decl.id === name) {
          const irStock = ir?.stocks.find((s) => s.id === name);
          return `**stock** \`${name}\`\n\ninit: ${irStock ? formatIRExpr(irStock.init) : "…"}${formatPosition(irStock?.position)}`;
        }
        break;
      case "AuxDecl":
        if (decl.id === name) {
          const irAux = ir?.aux.find((a) => a.id === name);
          return `**aux** \`${name}\`${irAux ? ` = ${formatIRExpr(irAux.expr)}` : ""}${formatPosition(irAux?.position)}`;
        }
        break;
      case "FlowDecl":
        if (decl.id === name) {
          const irFlow = ir?.flows.find((f) => f.id === name);
          const from = irFlow?.from ?? "null";
          const to = irFlow?.to ?? "null";
          return `**flow** \`${name}\`\n\nfrom: ${from} → to: ${to}${formatPosition(irFlow?.position)}`;
        }
        break;
      case "GfDecl":
        if (decl.id === name) {
          const irGf = ir?.graphicalFunctions.find((g) => g.id === name);
          const kind = irGf?.kind ?? "unknown";
          const points = irGf?.ypts?.length ?? 0;
          return `**gf** \`${name}\` (${kind}, ${points} points)`;
        }
        break;
    }
  }

  const upperName = name.toUpperCase();
  if (BUILTIN_ARITY[upperName]) {
    const { min, max } = BUILTIN_ARITY[upperName];
    const arity = min === max ? `${min}` : `${min}–${max}`;
    return `**builtin** \`${upperName}\`\n\narity: ${arity}`;
  }

  return null;
}

function formatPosition(position: IRPosition | undefined): string {
  return position ? `\nposition: (${position.x}, ${position.y})` : "";
}

function formatIRExpr(expr: IRExprNode): string {
  switch (expr.type) {
    case "Num":
      return String(expr.value);
    case "Ref":
      return expr.id;
    default:
      return "…";
  }
}
