# syntax

The parser's output contract: `Span` (1-based line/col), the AST node hierarchy
(`FileNode` … `ExpressionNode`), the syntactic `Diagnostic`, and `ParseResult`.
Self-contained — it has no dependency on other contract domains.
