# expression

The formula tree shared by the compiler, simulator, and renderer: `IRExpressionNode`
(post-parse, span-free; precedence already encoded in structure) and `IRBinaryOperator`.
Also the builtin-function contract — `BUILTIN_ARITY`, `BUILTIN_FUNCTIONS`,
`ZERO_ARG_BUILTINS` — the authoritative set of builtins and their argument counts.
