import { describe, it, expect } from "vitest";
import type { Hover } from "vscode-languageserver/node.js";
import { getHoverContent } from "../../src/features/hover.js";
import { parseSource } from "@sysdml/parser";
import { compileAST } from "@sysdml/ir";

const SOURCE = `model test
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

function analyze(source: string) {
  const { ast } = parseSource(source);
  if (ast === null) throw new Error("parseSource returned null for test source");
  const { ir } = compileAST(ast);
  return { ast, ir };
}

describe("getHoverContent", () => {
  it("returns stock info when hovering over a stock reference", () => {
    const { ast, ir } = analyze(SOURCE);
    // 'population' in 'rate: population * birth_rate' — line 14 (1-indexed) = 13 (0-indexed), col ~8
    const result = getHoverContent(ast, ir, { line: 13, character: 8 });
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(hoverValue(result)).toContain("population");
  });

  it("returns null when hovering over whitespace/non-ident", () => {
    const { ast, ir } = analyze(SOURCE);
    const result = getHoverContent(ast, ir, { line: 0, character: 0 });
    expect(result).toBeNull();
  });

  it("returns aux info when hovering over an aux reference", () => {
    const { ast, ir } = analyze(SOURCE);
    // 'birth_rate' in 'rate: population * birth_rate' — approx line 13, col ~23
    const result = getHoverContent(ast, ir, { line: 13, character: 23 });
    expect(result).not.toBeNull();
  });
});

const POSITION_SOURCE = [
  "model m",
  "time { start: 0",
  "  end: 10",
  "  step: 1",
  "}",
  "stock population {",
  "  init: 100",
  "  position: { x: 400, y: 300 }",
  "}",
  "aux birth_rate = 0.05",
  "flow births {",
  "  from: null",
  "  to: population",
  "  rate: population * birth_rate",
  "  position: { x: 250, y: 200 }",
  "}",
].join("\n");

function hoverValue(result: Hover): string {
  const c = result.contents;
  if (typeof c === "string") return c;
  if ("value" in c) return c.value;
  return "";
}

describe("getHoverContent — layout", () => {
  it("includes position in stock hover when present", () => {
    const { ast, ir } = analyze(POSITION_SOURCE);
    // 'population' in 'rate: population * rate' — line 13 (0-indexed), col 8
    const result = getHoverContent(ast, ir, { line: 13, character: 8 });
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(hoverValue(result)).toContain("(400, 300)");
  });

  it("does not show position in stock hover when absent", () => {
    const { ast, ir } = analyze(SOURCE);
    const result = getHoverContent(ast, ir, { line: 13, character: 8 });
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(hoverValue(result)).not.toContain("position:");
  });

  it("includes position in aux hover when present", () => {
    const src = [
      "model m",
      "time { start: 0",
      "  end: 10",
      "  step: 1",
      "}",
      "stock s { init: 0 }",
      "aux growth_rate = 0.02 { position: { x: 200, y: 100 } }",
      "flow f {",
      "  from: null",
      "  to: s",
      "  rate: s * growth_rate",
      "}",
    ].join("\n");
    const { ast, ir } = analyze(src);
    // 'growth_rate' in 'rate: s * growth_rate' — line 10 (0-indexed), col 13
    const result = getHoverContent(ast, ir, { line: 10, character: 13 });
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(hoverValue(result)).toContain("(200, 100)");
  });
});
