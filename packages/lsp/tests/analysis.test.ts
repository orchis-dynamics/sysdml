import { describe, it, expect } from "vitest";
import { analyzeDocument } from "../src/analysis.js";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";

const VALID_SOURCE = `model test
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
  rate: population * birth_rate
}
`;

describe("analyzeDocument", () => {
  it("returns no diagnostics for valid source", () => {
    const result = analyzeDocument(VALID_SOURCE);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.ast).not.toBeNull();
    expect(result.ir).not.toBeNull();
  });

  it("returns parse error diagnostic for invalid source", () => {
    const result = analyzeDocument("model test\nstock {");
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    expect(result.ast).toBeNull();
    expect(result.ir).toBeNull();
  });

  it("returns semantic diagnostic for undefined identifier", () => {
    const source = `model test
time {
  start: 0
  end: 10
  step: 1
}
stock s { init: ghost }
`;
    const result = analyzeDocument(source);
    const undef = result.diagnostics.find((d) =>
      d.message.includes("ghost"),
    );
    expect(undef).toBeDefined();
    expect(undef!.range.start.line).toBeGreaterThanOrEqual(0);
  });

  it("translates parser spans to 0-based, end-exclusive LSP ranges", () => {
    // line 7: s  t  o  c  k     s     {     i  n  i  t  :     g  h  o  s  t     }
    //         1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
    // 'ghost' is at 1-based cols 17-21 (end-inclusive).
    // LSP expects 0-based line/char and end-exclusive: line 6, chars 16..21.
    const source = `model test
time {
  start: 0
  end: 10
  step: 1
}
stock s { init: ghost }
`;
    const result = analyzeDocument(source);
    const undef = result.diagnostics.find((d) =>
      d.message.includes("ghost"),
    );
    expect(undef).toBeDefined();
    expect(undef!.range.start.line).toBe(6);
    expect(undef!.range.start.character).toBe(16);
    expect(undef!.range.end.line).toBe(6);
    expect(undef!.range.end.character).toBe(21);
  });
});
