import { DocumentSymbol, SymbolKind } from "vscode-languageserver/node.js";
import type { FileNode, DeclarationNode } from "@sysdml/parser";
import { spanToRange } from "../analysis.js";

export function getDocumentSymbols(ast: FileNode): DocumentSymbol[] {
  return ast.decls.flatMap((decl) => {
    const symbol = declToSymbol(decl);
    return symbol ? [symbol] : [];
  });
}

function declToSymbol(decl: DeclarationNode): DocumentSymbol | null {
  switch (decl.type) {
    case "StockDeclaration":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Variable,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "AuxiliaryDeclaration":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Constant,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "FlowDeclaration":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Function,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "GraphicalFunctionDeclaration":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Object,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "TimeDeclaration":
      return DocumentSymbol.create(
        "time",
        undefined,
        SymbolKind.Module,
        spanToRange(decl.span),
        spanToRange(decl.span),
      );
    case "ConnectionDeclaration":
      return null;
    default:
      const _exhaustive: never = decl;
      return _exhaustive;
  }
}
