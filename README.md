# SysDML

**System Dynamics Modeling Language** — a text-first, Git-native DSL for system dynamics modeling.

This repository is a [pnpm workspace](https://pnpm.io/workspaces) containing the language toolchain.

## Packages

| Package                                                            | Name                  | Description                                                  |
| ------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------ |
| [`packages/parser`](packages/parser/README.md)                     | `@sysdml/parser`      | ANTLR4 TypeScript parser: SysDML source → typed AST          |
| [`packages/ir`](packages/ir/README.md)                             | `@sysdml/ir`          | AST → Intermediate Representation, with semantic diagnostics |
| [`packages/simulator`](packages/simulator)                         | `@sysdml/simulator`   | Deterministic Euler simulator over IR                        |
| [`packages/lsp`](packages/lsp)                                     | `@sysdml/lsp-server`  | Language Server Protocol implementation                      |
| [`packages/renderer`](packages/renderer)                           | `@sysdml/renderer`    | Vue 3 + Vite diagram renderer                                |
| [`packages/vscode-extension`](packages/vscode-extension/README.md) | `sysdml-vscode`       | VS Code extension (language support + diagram view)          |

## Architecture

```
Parser → AST → IR → (Simulator | Renderer)
```

Each layer has strict boundaries — the parser produces only structural AST, with no semantic analysis or name resolution.

See `AGENT_CONTEXT.md` for architectural constraints and `docs/spec/` for language specifications.

## Requirements

- Node.js `>= 20`
- pnpm `>= 9`

## Setup

```sh
pnpm install
```

A single `pnpm-lock.yaml` and `node_modules/` live at the workspace root; each package gets its own symlinked `node_modules/` pointing at the shared store. Inter-package dependencies use `workspace:*` and are resolved via symlinks during development.

## Common scripts

Run from the workspace root:

```sh
pnpm build           # build every package (topological order)
pnpm test            # run tests in every package
pnpm lint            # lint every package that defines a lint script
pnpm clean           # remove dist/ in every package and root node_modules
```

Target a single package with `--filter`:

```sh
pnpm --filter @sysdml/parser build
pnpm --filter @sysdml/simulator test
pnpm --filter @sysdml/renderer dev
```

## Publishing

Packages are published independently to npm. `workspace:*` ranges are rewritten to actual semver at publish time, so consumers receive a normal npm package with no workspace references.
