import { describe, it, expect } from "vitest";
import { getCompletionItems } from "../../src/features/completion.js";
import { parseSource } from "@sysdml/parser";
import { compileAST } from "@sysdml/ir";
import { CompletionItemKind } from "vscode-languageserver/node.js";

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
`;

function analyze(source: string) {
  const { ast } = parseSource(source);
  const { ir } = compileAST(ast!);
  return { ast, ir };
}

describe("getCompletionItems", () => {
  it("offers keywords at top level", () => {
    const { ast, ir } = analyze(SOURCE);
    const items = getCompletionItems(SOURCE, ast, ir, {
      line: 15,
      character: 0,
    });
    const labels = items.map((i) => i.label);
    expect(labels).toContain("stock");
    expect(labels).toContain("aux");
    expect(labels).toContain("flow");
  });

  it("offers stock identifiers and null after 'from:'", () => {
    const { ast, ir } = analyze(SOURCE);
    // cursor after 'from: ' on line 11 (0-indexed) — right after the colon and space
    const items = getCompletionItems(SOURCE, ast, ir, {
      line: 11,
      character: 8,
    });
    const labels = items.map((i) => i.label);
    expect(labels).toContain("null");
    expect(labels).toContain("population");
    expect(labels).not.toContain("birth_rate"); // not a stock
  });

  it("offers all identifiers and builtins inside an expression", () => {
    const src = SOURCE.replace("rate: 1", "rate: ");
    // Note: this source won't parse because rate is incomplete, so ast and ir will be null.
    // That's OK - the feature should still work because we pass ast/ir from the valid source
    // and just check the context based on line/char position.
    const { ast, ir } = analyze(SOURCE);
    const items = getCompletionItems(src, ast, ir, { line: 13, character: 9 });
    const labels = items.map((i) => i.label);
    expect(labels).toContain("population");
    expect(labels).toContain("birth_rate");
    expect(labels).toContain("ABS");
  });

  it("offers kind values after 'kind:'", () => {
    const src = `sfd test\ntime { start: 0\n end: 10\n step: 1\n}\nstock s { init: 0 }\ngf lk { kind: `;
    const items = getCompletionItems(src, null, null, { line: 6, character: 14 });
    const labels = items.map((i) => i.label);
    expect(labels).toContain("linear");
    expect(labels).toContain("extra");
    expect(labels).toContain("step");
  });

  describe("layout keyword completions", () => {
    it("suggests 'position' inside a stock block", () => {
      const src = "sfd m\nstock s {\n  init: 100\n  ";
      const items = getCompletionItems(src, null, null, { line: 3, character: 2 });
      const labels = items.map((i) => i.label);
      expect(labels).toContain("position");
      const positionItem = items.find((i) => i.label === "position");
      expect(positionItem).toBeDefined();
      expect(positionItem?.kind).toBe(CompletionItemKind.Keyword);
    });

    it("suggests 'via' inside a flow block", () => {
      const src = "sfd m\nflow f {\n  from: null\n  to: s\n  rate: 0.01\n  ";
      const items = getCompletionItems(src, null, null, { line: 5, character: 2 });
      const labels = items.map((i) => i.label);
      expect(labels).toContain("via");
      const viaItem = items.find((i) => i.label === "via");
      expect(viaItem).toBeDefined();
      expect(viaItem?.kind).toBe(CompletionItemKind.Keyword);
    });

    it("suggests 'angle' inside a connection block", () => {
      const src = "sfd m\nstock s { init: 0 }\na ->+ s {\n  ";
      const items = getCompletionItems(src, null, null, { line: 3, character: 2 });
      const labels = items.map((i) => i.label);
      expect(labels).toContain("angle");
      const angleItem = items.find((i) => i.label === "angle");
      expect(angleItem).toBeDefined();
      expect(angleItem?.kind).toBe(CompletionItemKind.Keyword);
    });
  });
});
