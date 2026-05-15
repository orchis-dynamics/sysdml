import { DocumentSymbol, SymbolKind } from "vscode-languageserver/node.js";
import type { FileNode, DeclNode } from "@sysdml/parser";
import { spanToRange } from "../analysis.js";

export function getDocumentSymbols(ast: FileNode): DocumentSymbol[] {
  return ast.decls.flatMap((decl) => {
    const symbol = declToSymbol(decl);
    return symbol ? [symbol] : [];
  });
}

function declToSymbol(decl: DeclNode): DocumentSymbol | null {
  switch (decl.type) {
    case "StockDecl":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Variable,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "AuxDecl":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Constant,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "FlowDecl":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Function,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "GfDecl":
      return DocumentSymbol.create(
        decl.id,
        undefined,
        SymbolKind.Object,
        spanToRange(decl.span),
        spanToRange(decl.idSpan),
      );
    case "TimeDecl":
      return DocumentSymbol.create(
        "time",
        undefined,
        SymbolKind.Module,
        spanToRange(decl.span),
        spanToRange(decl.span),
      );
    case "ConnectionDecl":
      return null;
    default:
      const _exhaustive: never = decl;
      return _exhaustive;
  }
}
