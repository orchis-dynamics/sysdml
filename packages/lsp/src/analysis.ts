import { parseSource } from "@sysdml/parser";
import { compileAST } from "@sysdml/ir";
import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from "vscode-languageserver/node.js";
import type { FileNode } from "@sysdml/parser";
import type { IR, Span, IRDiagnostic } from "@sysdml/ir";

export interface DocumentAnalysis {
  ast: FileNode | null;
  ir: IR | null;
  diagnostics: Diagnostic[];
  irDiagnostics: IRDiagnostic[];
}

export function spanToRange(span: Span): Range {
  // Parser spans are 1-based and end-inclusive; LSP Ranges are 0-based and end-exclusive.
  // For end.col: -1 (1→0 base) cancels with +1 (inclusive→exclusive), net zero.
  return Range.create(
    span.start.line - 1,
    span.start.col - 1,
    span.end.line - 1,
    span.end.col,
  );
}

export function analyzeDocument(source: string): DocumentAnalysis {
  const parseResult = parseSource(source);
  const diagnostics: Diagnostic[] = [];
  let irDiagnostics: IRDiagnostic[] = [];

  for (const d of parseResult.diagnostics) {
    diagnostics.push(
      Diagnostic.create(
        spanToRange(d.span),
        d.message,
        DiagnosticSeverity.Error,
        undefined,
        "sysdml",
      ),
    );
  }

  if (!parseResult.ast) {
    return { ast: null, ir: null, diagnostics, irDiagnostics };
  }

  const compileResult = compileAST(parseResult.ast);
  irDiagnostics = compileResult.diagnostics;

  for (const d of compileResult.diagnostics) {
    const range = d.span
      ? spanToRange(d.span)
      : Range.create(0, 0, 0, 0);
    diagnostics.push(
      Diagnostic.create(
        range,
        d.message,
        DiagnosticSeverity.Error,
        d.code,
        "sysdml",
      ),
    );
  }

  return {
    ast: parseResult.ast,
    ir: compileResult.ir,
    diagnostics,
    irDiagnostics,
  };
}
