# @sysdml/contracts

The shared contract surface between SysDML packages.

## Inclusion rule

A type lives here **if and only if it crosses a package boundary** — it is imported by
a package other than the one that produces it. Package-private types stay in their owning
package. This package holds **no behavior**: only types plus the enums and const-tables
that define a contract's valid value-space (e.g. `DiagnosticCode`, `BUILTIN_*`).

## Domains

- `expression/` — the formula tree (`IRExpressionNode`) and the builtin-function tables.
- `syntax/` — parser output: `Span`, AST nodes, `Diagnostic`, `ParseResult`.
- `diagnostics/` — semantic diagnostics from compilation (`IRDiagnostic`) and simulation.
- `model/` — the system-dynamics model graph (`IR` and its parts) and `CompileResult`.
- `simulation/` — simulation output (`SimulationResult`, `SimRow`, `Simulator`).
- `protocol/` — serialized messages crossing process boundaries (extension ↔ webview).
  Runtime schemas land here when added.

## Domain dependency graph

The domains form an acyclic graph: `expression` and `syntax` are leaves, and the
arrows point from a domain to the domains it depends on.

```mermaid
graph TD
  expression["expression — leaf"]
  syntax["syntax — leaf"]
  diagnostics --> syntax
  model --> expression
  model --> diagnostics
  simulation --> model
  simulation --> diagnostics
  protocol --> model
```

## Model shape

How the `IR` model graph (the `model/` domain) composes, and where the shared
`IRExpressionNode` formula tree (`expression/` domain) is referenced.

```mermaid
graph TD
  CompileResult --> IR
  CompileResult --> IRDiagnostic
  IR --> IRTime
  IR --> IRStock
  IR --> IRFlow
  IR --> IRAuxiliary
  IR --> IRConnection
  IR --> IRGraphicalFunction
  IRStock -->|init| IRExpressionNode
  IRAuxiliary -->|expr| IRExpressionNode
  IRFlow -->|rate| IRExpressionNode
  IRStock -.position.-> IRPosition
  IRFlow -.position / via.-> IRPosition
  IRConnection -.via.-> IRPosition
```
