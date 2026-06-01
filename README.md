# SysDML

**System Dynamics Modeling Language** — a text-first, Git-native DSL for system dynamics modeling.

This repository is a [pnpm workspace](https://pnpm.io/workspaces) containing the language toolchain.

## Packages

| Package                                                            | Name                 | Description                                                   |
| ------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------- |
| [`packages/parser`](packages/parser/README.md)                     | `@sysdml/parser`     | ANTLR4 TypeScript parser: SysDML source → typed AST           |
| [`packages/ir`](packages/ir/README.md)                             | `@sysdml/ir`         | AST → Intermediate Representation, with semantic diagnostics  |
| [`packages/simulator`](packages/simulator)                         | `@sysdml/simulator`  | Deterministic Euler simulator over IR                         |
| [`packages/lsp`](packages/lsp)                                     | `@sysdml/lsp-server` | Language Server Protocol implementation                       |
| [`packages/renderer`](packages/renderer)                           | `@sysdml/renderer`   | Vue 3 + Vite diagram renderer                                 |
| [`packages/cli`](packages/cli/README.md)                           | `@sysdml/cli`        | `sysdml` command-line tool (`parse` + `simulate` subcommands) |
| [`packages/vscode-extension`](packages/vscode-extension/README.md) | `sysdml-vscode`      | VS Code extension (language support + diagram view)           |

## Architecture

```
Parser → AST → IR → (Simulator | Renderer)
```

Each layer has strict boundaries — the parser produces only structural AST, with no semantic analysis or name resolution.

See `AGENT_CONTEXT.md` for architectural constraints and `docs/spec/` for language specifications.

## Requirements

- Node.js `>= 20`
- pnpm `>= 9`

## Install from Git

The packages are not published to npm yet, so install from source:

```sh
git clone https://github.com/orchis-dynamics/sysdml.git
cd sysdml
pnpm install
pnpm build
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

## Try it out in VS Code

The recommended way to write and test models is the **SysDML VS Code extension**, which gives you syntax highlighting, live diagnostics, and the stock-and-flow / causal-loop diagram view.

Build the extension once:

```sh
pnpm --filter sysdml-vscode build
```

Then open this repository in VS Code and press **F5** (the **Run Extension** launch configuration). A second VS Code window — the Extension Development Host — opens with the extension loaded and the `population_growth` example already on screen.

To use it in your everyday editor instead, package a `.vsix` and install it:

```sh
pnpm --filter sysdml-vscode package
code --install-extension packages/vscode-extension/sysdml-vscode-0.1.0.vsix
```

## A model to test with

Create a file and **save it with the `.sysdml` extension** (the extension only activates on `.sysdml` files), for example `population_growth.sysdml`, then paste the model below. With the file open, click **SysDML: Open Diagram** in the editor title bar to render it.

```
sfd population_growth

time {
  start: 0
  end: 100
  step: 1
}

aux populationInit = 1000

stock population {
  init: populationInit
}

aux deadPeopleInit = 1000

stock dead_people {
  init: deadPeopleInit
}

aux immigration_rate = 0.025

flow immigration {
  from: null
  to: population
  rate: population * immigration_rate
}

aux birth_rate = 0.02

flow births {
  from: null
  to: population
  rate: population * birth_rate
}

aux death_rate = 0.03

flow deaths {
  from: population
  to: dead_people
  rate: population * 0.019
}

stock waterStock {
  init: 1000000
}

aux rain_rate = 0.05

flow rain {
  from: null
  to: waterStock
  rate: waterStock * rain_rate
}

aux evaporation_rate = 0.055

flow evaporation {
  from: waterStock
  to: null
  rate: waterStock * evaporation_rate
}

population ->+ births

birth_rate ->+ births

population ->+ deaths

immigration_rate ->+ immigration

death_rate ->+ deaths

waterStock ->+ evaporation

waterStock ->+ rain

rain_rate ->+ rain

evaporation_rate ->+ evaporation
```
