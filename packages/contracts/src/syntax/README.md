# syntax

The parser's output contract: `Span` (1-based line/col), the AST node hierarchy
(`FileNode` … `ExpressionNode`), the syntactic `Diagnostic`, and `ParseResult`.
Self-contained — it has no dependency on other contract domains.

Also the reserved keyword vocabulary (`TOP_LEVEL_KEYWORDS`,
`BLOCK_PROPERTY_KEYWORDS`, `PROPERTY_KEYWORDS`, `LOGICAL_OPERATOR_KEYWORDS`,
`CONSTANT_KEYWORDS`, `ALL_KEYWORDS`) — the single source of truth for the
grammar's reserved words, consumed by the LSP completion provider and the Monaco
syntax highlighter. The parser package's `grammar-keyword-sync` test guards it
against drift from `SYSDML.g4`.
