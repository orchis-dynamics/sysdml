# @sysdml/ir

TypeScript compiler that lowers a `@sysdml/parser` AST into a typed Intermediate Representation (IR) ready for simulation.

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## Usage

```ts
import { parseSource } from "@sysdml/parser";
import { compileAST } from "@sysdml/ir";

const { ast, diagnostics: parseErrors } = parseSource(source);

if (parseErrors.length > 0) {
	for (const d of parseErrors) {
		console.error(`${d.span.start.line}:${d.span.start.col} ${d.message}`);
	}
} else {
	const { ir, diagnostics: compileErrors } = compileAST(ast);

	if (compileErrors.length > 0) {
		for (const d of compileErrors) {
			console.error(`${d.code}: ${d.message}`);
		}
	} else {
		console.log(ir);
	}
}
```

`compileAST` never throws. Semantic errors are returned as `IRDiagnostic[]` with a `DiagnosticCode` and a human-readable message. When there are errors, `ir` is `null`.

## Setup

```sh
npm install
npm run build
```

## Test

```sh
npm test
```

---

## What the compiler does

`compileAST` takes a `FileNode` (the root AST node produced by `@sysdml/parser`) and returns a `CompileResult`:

- **Multi-model handling** — files with more than one `model` declaration emit a non-fatal `MULTI_MODEL_NOT_SUPPORTED` diagnostic for each submodel; only the entry model is compiled.
- **Structural validation** — requires exactly one `time` block and at least one `stock`.
- **Duplicate checks** — rejects duplicate identifiers across stocks, aux, and flows; rejects duplicate or conflicting graphical-function names.
- **Builtin-shadow check** — rejects variable identifiers (stock / aux / flow) that match a built-in function name (case-insensitive).
- **Flow endpoint checks** — ensures `from` and `to` references resolve to declared stocks.
- **Expression compilation** — walks every expression tree, resolves identifier references, validates function names and arities, and lowers `GroupedExpression` / `UnaryPlus` / `IF_THEN_ELSE` calls to canonical IR nodes.
- **Graphical function validation** — checks required fields, xscale/xpts mutual exclusivity, xpts strict-ascending order, and the `step` kind invariant.
- **`LOOKUP` lowering** — `LOOKUP(input, y0, y1, …)` calls are compiled to synthetic `IRGraphicalFunction` entries with auto-generated names (prefixed `__lookup_<n>`).

---

## IR Reference

### Top level

```ts
interface IR {
	ir_version: "0.1";
	model: { id: string };
	time: IRTime;
	stocks: IRStock[];
	auxiliaries: IRAuxiliary[];
	flows: IRFlow[];
	connections: IRConnection[];
	graphicalFunctions: IRGraphicalFunction[];
}
```

### `IRTime`

```ts
interface IRTime {
	start: number;
	end: number;
	step: number;
}
```

### `IRPosition`

Layout coordinates carried through from the parser AST onto stock, aux, flow, and connection nodes.

```ts
interface IRPosition {
	x: number;
	y: number;
}
```

### `IRStock`

```ts
interface IRStock {
	id: string;
	init: IRExpressionNode;
	position?: IRPosition;
}
```

### `IRAuxiliary`

```ts
interface IRAuxiliary {
	id: string;
	expr: IRExpressionNode;
	position?: IRPosition;
}
```

### `IRFlow`

`via` is the list of waypoints describing the flow's polyline route between endpoints.

```ts
interface IRFlow {
	id: string;
	from: string | null; // null = open source
	to: string | null; // null = open sink
	rate: IRExpressionNode;
	position?: IRPosition;
	via?: IRPosition[];
}
```

### `IRConnection`

```ts
interface IRConnection {
	from: string;
	polarity: "+" | "-" | "=>";
	to: string;
	angle?: number;       // degrees, for curved-arrow rendering
	via?: IRPosition;     // optional single waypoint
}
```

### `IRGraphicalFunction`

Exactly one of `xscale` or `xpts` is set (never both, never neither).

```ts
type IRGraphicalFunctionKind = "linear" | "extra" | "step";

interface IRGraphicalFunction {
	id: string;
	kind: IRGraphicalFunctionKind;
	xscale: [number, number] | null;
	xpts: number[] | null;
	ypts: number[];
	yscale: [number, number] | null;
}
```

### `IRExpressionNode`

All expression nodes are span-free. `GroupedExpression` is collapsed; tree structure encodes precedence. Comparison and logical operators return `1.0` (true) or `0.0` (false) at simulation time.

```ts
type IRBinaryOperator =
	| "+"
	| "-"
	| "*"
	| "/"
	| "^"
	| "MOD"
	| "<"
	| "<="
	| ">"
	| ">="
	| "="
	| "<>"
	| "AND"
	| "OR";

type IRExpressionNode =
	| { type: "Number"; value: number }
	| { type: "Reference"; id: string }
	| { type: "BinaryOperation"; op: IRBinaryOperator; left: IRExpressionNode; right: IRExpressionNode }
	| { type: "UnaryMinus"; operand: IRExpressionNode }
	| { type: "Not"; operand: IRExpressionNode }
	| {
			type: "IfThenElse";
			cond: IRExpressionNode;
			thenBranch: IRExpressionNode;
			elseBranch: IRExpressionNode;
	  }
	| { type: "FunctionCall"; name: string; args: IRExpressionNode[] }
	| { type: "GraphicalFunctionCall"; name: string; argument: IRExpressionNode };
```

---

## Built-in functions

| Category          | Functions                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Math (1 arg)      | `ABS` `INT` `SQRT` `EXP` `LN` `LOG10` `SIN` `COS` `TAN` `ARCSIN` `ARCCOS` `ARCTAN` `SIGN`                                            |
| Math (2 args)     | `MIN` `MAX`                                                                                                                          |
| Math (3 args)     | `SAFEDIV(value, divisor, default)`                                                                                                   |
| Zero-arg          | `TIME` `DT` `STARTTIME` `STOPTIME` `PI` `INF`                                                                                        |
| Memory            | `INIT(x)` `PREVIOUS(x, default)` `SELF()`                                                                                            |
| Delay & smoothing | `DELAY1` `DELAY3` `DELAYN` `DELAY` `SMTH1` `SMTH3` `SMTHN` `TREND` `FORCST`                                                          |
| Test inputs       | `STEP(height, start)` `RAMP(slope, start)` `PULSE(magnitude, start[, interval])`                                                     |
| Statistical       | `RANDOM(min, max[, seed])` `NORMAL(mean, std[, seed])` `LOGNORMAL(mean, std[, seed])` `EXPRND(mean[, seed])` `POISSON(mean[, seed])` |
| Conditional       | `IF_THEN_ELSE(cond, then, else)` — lowered to `IfThenElse` IR node                                                                   |
| Inline lookup     | `LOOKUP(input, y0, y1, …)` — lowered to a synthetic `GraphicalFunctionCall`                                                                         |

---

## Diagnostic codes

| Code                       | Meaning                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `MULTI_MODEL_NOT_SUPPORTED`| Extra `model` declaration beyond the entry model (non-fatal)   |
| `MISSING_TIME_BLOCK`       | No `time` block found                                          |
| `DUPLICATE_TIME_BLOCK`     | More than one `time` block                                     |
| `MISSING_STOCK`            | No stocks declared                                             |
| `MISSING_STOCK_INIT`       | Stock is missing its `init` property                           |
| `DUPLICATE_IDENTIFIER`     | Same name used for two stocks, aux, or flows                   |
| `IDENTIFIER_SHADOWS_BUILTIN` | Variable identifier collides with a built-in function name   |
| `MISSING_FLOW_PROPERTY`    | Flow missing `from`, `to`, or `rate`                           |
| `INVALID_FLOW_ENDPOINT`    | `from` or `to` references an undeclared stock                  |
| `UNDEFINED_IDENTIFIER`     | Expression references an unknown variable                      |
| `INVALID_TIME_STEP`        | `time.step` is ≤ 0                                             |
| `INVALID_TIME_RANGE`       | `time.end` < `time.start`                                      |
| `UNKNOWN_FUNCTION`         | Function name not in built-in set and not a graphical function |
| `WRONG_ARITY`              | Built-in called with wrong number of arguments                 |
| `INVALID_GF_KIND`          | `kind` is not `linear`, `extra`, or `step`                     |
| `MISSING_YPTS`             | Graphical function has no `ypts`                               |
| `MISSING_X_DEFINITION`     | Graphical function has neither `xscale` nor `xpts`             |
| `CONFLICTING_X_DEFINITION` | Graphical function has both `xscale` and `xpts`                |
| `XSCALE_WRONG_COUNT`       | `xscale` does not have exactly 2 values                        |
| `XPTS_YPTS_COUNT_MISMATCH` | `xpts` and `ypts` have different lengths                       |
| `XPTS_NOT_ASCENDING`       | `xpts` values are not strictly ascending                       |
| `STEP_LAST_YPTS_MISMATCH`  | `kind: step` requires the last two y-values to be equal        |
| `DUPLICATE_GF`             | Two graphical functions share the same name                    |
| `GF_NAME_CONFLICT`         | Graphical function name clashes with a stock, aux, or flow     |
| `GF_WRONG_ARITY`           | Graphical function called with other than 1 argument           |
| `LOOKUP_TOO_FEW_YPTS`      | `LOOKUP` called with fewer than 2 y-point arguments            |
| `LOOKUP_NON_LITERAL_YPTS`  | `LOOKUP` y-point arguments must be numeric literals            |

---

## Credits

Code and documentation co-authored with [Claude Sonnet](https://anthropic.com) and [Claude Opus](https://anthropic.com) by Anthropic.
