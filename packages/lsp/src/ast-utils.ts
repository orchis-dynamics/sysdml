import type { FileNode, DeclarationNode, ExpressionNode } from "@sysdml/parser";
import type { Position } from "vscode-languageserver/node.js";
import type { Span } from "@sysdml/ir";

export function isPositionInSpan(position: Position, span: Span): boolean {
  // LSP positions are 0-based; parser spans are 1-based (end-inclusive).
  const line = position.line + 1;
  const col = position.character + 1;
  if (line < span.start.line || line > span.end.line) return false;
  if (line === span.start.line && col < span.start.col) return false;
  if (line === span.end.line && col >= span.end.col) return false;
  return true;
}

export function findIdentAtPosition(
  ast: FileNode,
  position: Position,
): string | null {
  for (const decl of ast.decls) {
    const found = findIdentInDecl(decl, position);
    if (found !== null) return found;
  }
  return null;
}

function findIdentInDecl(decl: DeclarationNode, position: Position): string | null {
  switch (decl.type) {
    case "StockDeclaration":
      for (const prop of decl.props) {
        const found = findIdentInExpr(prop.init, position);
        if (found !== null) return found;
      }
      return null;
    case "AuxiliaryDeclaration":
      return findIdentInExpr(decl.expr, position);
    case "FlowDeclaration":
      for (const prop of decl.props) {
        if (prop.key === "rate") {
          const found = findIdentInExpr(prop.value, position);
          if (found !== null) return found;
        }
      }
      return null;
    default:
      return null;
  }
}

function findIdentInExpr(expr: ExpressionNode, position: Position): string | null {
  if (!isPositionInSpan(position, expr.span)) return null;
  switch (expr.type) {
    case "IdentifierReference":
      return expr.name;
    case "BinaryExpression": {
      const left = findIdentInExpr(expr.left, position);
      return left ?? findIdentInExpr(expr.right, position);
    }
    case "UnaryExpression":
      return findIdentInExpr(expr.operand, position);
    case "GroupedExpression":
      return findIdentInExpr(expr.expr, position);
    case "FunctionCall": {
      if (isPositionInSpan(position, expr.nameSpan)) return expr.name;
      for (const arg of expr.args) {
        const found = findIdentInExpr(arg, position);
        if (found !== null) return found;
      }
      return null;
    }
    case "IfThenElse": {
      return (
        findIdentInExpr(expr.cond, position) ??
        findIdentInExpr(expr.thenBranch, position) ??
        findIdentInExpr(expr.elseBranch, position)
      );
    }
    default:
      return null;
  }
}
