# @sysdml/cli

Command-line interface for the SysDML toolchain. Wraps the parser, IR compiler, and simulator into a single `sysdml` binary.

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## Installation

Inside the workspace the binary is linked automatically by `pnpm install`. Invoke it via `pnpm exec sysdml ...` or the symlinked `./node_modules/.bin/sysdml`.

For external use (once published):

```sh
npm install -g @sysdml/cli
# or
pnpm add @sysdml/cli
```

## Subcommands

```
sysdml parse <file>
sysdml simulate <file> [--csv]
sysdml --help
```

Global flags (`--help`, `-h`) and subcommands can appear in any order: `sysdml --csv simulate model.sysdml` works the same as `sysdml simulate model.sysdml --csv`.

### `sysdml parse <file>`

Parses a `.sysdml` file and prints the AST as JSON to stdout.

```sh
sysdml parse model.sysdml > ast.json
```

- **stdout** — pretty-printed AST JSON
- **stderr** — parse diagnostics under a `--- Diagnostics ---` header (each line prefixed with `[line:col]`)
- **exit code** — `0` on success, `1` on parse errors

### `sysdml simulate <file> [--csv]`

Parses, compiles, and runs the model. Default output is JSON; pass `--csv` for a comma-separated table with a header row.

```sh
# JSON (default)
sysdml simulate model.sysdml > result.json

# CSV: time + stock + aux + flow columns in IR declaration order
sysdml simulate model.sysdml --csv > result.csv
```

- **stdout** — simulation result (full JS precision, no rounding)
- **stderr** — compile or simulator diagnostics under a `--- Diagnostics ---` header
- **exit code**
  - `0` — simulation produced output (even if non-fatal sim diagnostics fired)
  - `1` — parse error, compile error, missing file, unknown subcommand, or unknown flag
  - `2` — internal/unexpected error

## CSV format

| Column order | Source                                  |
| ------------ | --------------------------------------- |
| `time`       | Simulation step                         |
| stocks       | `ir.stocks` in declaration order        |
| aux          | `ir.auxiliaries` in declaration order   |
| flows        | `ir.flows` in declaration order         |

One row per integration step (no `saveper` separation in v0.1). Numbers are stringified at full JS precision.

## Programmatic use

The parse → compile → simulate pipeline is exported as a subpath so other Node consumers (such as the VS Code extension) can run the same sequence without spawning the CLI:

```ts
import { runPipeline } from "@sysdml/cli/pipeline";

const { ast, parseDiagnostics, ir, compileDiagnostics, simulation } =
  runPipeline(source);
```

`runPipeline` short-circuits: it returns early with `ir: null` if parsing fails and `simulation: null` if compilation fails. All diagnostics are typed and structured (`Diagnostic` from `@sysdml/parser`, `IRDiagnostic` from `@sysdml/ir`, `SimDiagnostic` from `@sysdml/simulator`).

## Examples

Round-trip a model into a CSV that pandas/polars can read:

```sh
sysdml simulate examples/population_growth.sysdml --csv > out.csv
python -c 'import pandas as pd; print(pd.read_csv("out.csv").head())'
```

Pipe the AST to `jq` for ad-hoc analysis:

```sh
sysdml parse model.sysdml | jq '.decls[] | select(.type == "StockDeclaration") | .id'
```

Detect compile errors in a CI script:

```sh
if ! sysdml simulate model.sysdml > /dev/null; then
  echo "Model failed to simulate" >&2
  exit 1
fi
```

## Development

```sh
# build
pnpm --filter @sysdml/cli build

# test (unit + integration)
pnpm --filter @sysdml/cli test

# run the built binary directly
node packages/cli/dist/src/index.js simulate path/to/model.sysdml --csv
```

Unit tests cover `runPipeline`, `formatCsv`, and the two subcommand handlers. `tests/integration.test.ts` spawns the built binary against fixtures in `tests/fixtures/` to verify end-to-end behavior including help text, exit codes, and CSV/JSON output shapes.

---

## Credits

Code and documentation co-authored with [Claude Sonnet](https://anthropic.com) and [Claude Opus](https://anthropic.com) by Anthropic.
