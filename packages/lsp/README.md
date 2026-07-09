# @sysdml/lsp-server

Language Server Protocol implementation for SysDML — diagnostics, completion, and the other editor-facing language features, built on `vscode-languageserver`.

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## Entry points

- `@sysdml/lsp-server` (default export) — Node.js entry, wires up `createConnection(ProposedFeatures.all)` from `vscode-languageserver/node.js`. Also installable as a standalone binary via the `sysdml-lsp` command.
- `@sysdml/lsp-server/browser` — browser/worker-compatible entry, for hosting the language server inside a Web Worker (used by the SysDML web playground's in-browser Monaco integration).

Both build on `@sysdml/parser`, `@sysdml/ir`, and `@sysdml/layout` to turn SysDML source into diagnostics and editor features, using `@sysdml/contracts` for the shared protocol types.

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
