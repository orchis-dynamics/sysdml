import { describe, it, expect } from "vitest";
import { getDocumentSymbols } from "../../src/features/symbols.js";
import { parseSource } from "@sysdml/parser";
import { SymbolKind } from "vscode-languageserver/node.js";

const SOURCE = `sfd test
time {
  start: 0
  end: 10
  step: 1
}
stock population {
  init: 100
}
aux birth_rate = 0.02
flow births {
  from: null
  to: population
  rate: 1
}
gf my_lookup {
  kind: linear
  xscale: [0, 10]
  ypts: [0, 1]
}
`;

describe("getDocumentSymbols", () => {
  it("returns a symbol for each top-level declaration (at least 5)", () => {
    const { ast } = parseSource(SOURCE);
    const symbols = getDocumentSymbols(ast!);
    expect(symbols.length).toBeGreaterThanOrEqual(5);
  });

  it("maps StockDeclaration to SymbolKind.Variable", () => {
    const { ast } = parseSource(SOURCE);
    const symbols = getDocumentSymbols(ast!);
    const stock = symbols.find((s) => s.name === "population");
    expect(stock?.kind).toBe(SymbolKind.Variable);
  });

  it("maps AuxiliaryDeclaration to SymbolKind.Constant", () => {
    const { ast } = parseSource(SOURCE);
    const symbols = getDocumentSymbols(ast!);
    const aux = symbols.find((s) => s.name === "birth_rate");
    expect(aux?.kind).toBe(SymbolKind.Constant);
  });

  it("maps FlowDeclaration to SymbolKind.Function", () => {
    const { ast } = parseSource(SOURCE);
    const symbols = getDocumentSymbols(ast!);
    const flow = symbols.find((s) => s.name === "births");
    expect(flow?.kind).toBe(SymbolKind.Function);
  });

  it("maps GraphicalFunctionDeclaration to SymbolKind.Object", () => {
    const { ast } = parseSource(SOURCE);
    const symbols = getDocumentSymbols(ast!);
    const gf = symbols.find((s) => s.name === "my_lookup");
    expect(gf?.kind).toBe(SymbolKind.Object);
  });

  it("maps TimeDeclaration to SymbolKind.Module with name 'time'", () => {
    const { ast } = parseSource(SOURCE);
    const symbols = getDocumentSymbols(ast!);
    const time = symbols.find((s) => s.name === "time");
    expect(time?.kind).toBe(SymbolKind.Module);
  });
});
