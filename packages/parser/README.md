# @sysdml/parser

ANTLR4 TypeScript parser for SYSDML. Converts source text into a typed AST covering Stock-and-Flow Diagram (SFD) and Causal Loop Diagram (CLD) syntax.

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## Usage

```ts
import { parseSource } from "@sysdml/parser";

const { ast, diagnostics } = parseSource(source);

if (diagnostics.length > 0) {
	for (const d of diagnostics) {
		console.error(`${d.span.start.line}:${d.span.start.col} ${d.message}`);
	}
} else {
	console.log(ast);
}
```

`parseSource` never throws. Syntax errors are returned as `Diagnostic[]` with line/column spans.

## Setup

```sh
npm install
npm run build
```

`npm run build` runs the ANTLR generator then `tsc`.

## Test

```sh
npm test
```

---

## Supported Syntax

Every file must begin with a model declaration. All other declarations follow in any order.

### Model declaration

```
sfd <id>
cld <id>
```

`sfd` declares a stock-and-flow model; `cld` declares a causal loop model. A file may contain multiple model declarations. The first is the entry model (`ast.model`); any subsequent ones land in `ast.submodels`, reserved for a future `module` instantiation construct. Only one model is supported at the moment.

### Time block

```
time {
  start:       <number>
  end:         <number>
  step:        <number>
  save_step?:  <number>       # save interval, defaults to step
  time_units?: <identifier>   # e.g. years
}
```

### Stock

```
stock <id> {
  init:      <expr>
  position?: { x: <num>, y: <num> }   # layout
}
```

### Flow

`from` and `to` accept either an identifier or `null` (open endpoint).

```
flow <id> {
  from:      <id> | null
  to:        <id> | null
  rate:      <expr>
  position?: { x: <num>, y: <num> }            # layout
  via?:      [{ x: <num>, y: <num> }, ...]     # waypoints
}
```

### Aux

The general form is an identifier bound to an expression:

```
aux <id> = <expr>
```

For graphical aux, call either a named `gf` (see below) or the inline `LOOKUP()` built-in:

```
aux <id> = my_curve(<expr>)
aux <id> = LOOKUP(<expr>, <y0>, <y1>, …)
```

An optional trailing metadata block carries layout information:

```
aux <id> = <expr> { position: { x: <num>, y: <num> } }
```

### Graphical function (named)

A standalone named lookup table that can be called as a function in expressions.

```
gf <id> {
  kind?:   linear | extra | step   # default linear
  xscale?: [<min>, <max>]          # domain bounds (use with ypts)
  xpts?:   [<n>, ...]              # explicit x values (alternative to xscale)
  ypts:    [<n>, ...]              # output values
  yscale?: [<min>, <max>]          # range bounds
}
```

Examples:

```
gf effect_of_crowding {
  xscale: [0, 1]
  ypts:   [1, 0.9, 0.7, 0.4, 0.1]
}

gf response_curve {
  kind:  step
  xpts:  [0, 0.25, 0.5, 0.75, 1]
  ypts:  [0, 0.1,  0.5, 0.9,  1]
  yscale: [0, 1]
}
```

A named `gf` is called like a function in expressions:

```
aux crowding_effect = effect_of_crowding(density)
```

### CLD connections

```
<from> ->+ <to>    # positive causal link
<from> ->- <to>    # negative causal link
<from> => <to>     # flow-to-stock connection
```

Any connection may carry an optional layout block:

```
<from> ->+ <to> {
  angle?: <num>                       # degrees
  via?:   { x: <num>, y: <num> }      # waypoint
}
```

---

## Expressions

Expressions appear in `aux`, `stock init`, and `flow rate`.

### Literals and references

| Syntax       | Meaning                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `42`, `3.14` | Number literal (integer or decimal). Scientific notation is not supported — write `2*10^-6` instead. |
| `population` | Identifier reference                                                                                 |

### Arithmetic operators

| Operator        | Meaning                                         |
| --------------- | ----------------------------------------------- |
| `+` `-` `*` `/` | Addition, subtraction, multiplication, division |
| `^`             | Exponentiation                                  |
| `MOD`           | Modulo                                          |

### Comparison operators

| Operator          | Meaning    |
| ----------------- | ---------- |
| `<` `<=` `>` `>=` | Relational |
| `=`               | Equality   |
| `<>`              | Not equal  |

### Logical operators

| Operator | C-style alias | Meaning                    |
| -------- | ------------- | -------------------------- |
| `AND`    | `&&`          | Logical and                |
| `OR`     | `\|\|`        | Logical or                 |
| `NOT`    | `!`           | Logical not                |
| _(none)_ | `==`          | Equality (alias for `=`)   |
| _(none)_ | `!=`          | Not equal (alias for `<>`) |

C-style aliases produce identical AST nodes to their keyword equivalents.

### Unary operators

```
-<expr>     # negation
+<expr>     # identity
NOT <expr>  # logical not
```

### Grouping

```
(<expr>)
```

### Function calls

```
FUNC()
FUNC(arg)
FUNC(arg1, arg2, ...)
```

The parser accepts any identifier as a function name; unknown names are rejected at a later compiler stage. See [Built-in functions](#built-in-functions) for the names the IR and simulator recognise.

### If/then/else

```
IF <cond> THEN <expr> ELSE <expr>
```

Nested `IF` binds to the nearest `THEN`/`ELSE`:

```
IF a THEN IF b THEN c ELSE d ELSE e
# equivalent to:
IF a THEN (IF b THEN c ELSE d) ELSE e
```

### Precedence (high to low)

| Level        | Operators          |
| ------------ | ------------------ |
| 1 (tightest) | `^`                |
| 2            | Unary `-` `+`      |
| 3            | `*` `/` `MOD`      |
| 4            | `+` `-`            |
| 5            | `<` `<=` `>` `>=`  |
| 6            | `=` `<>` `==` `!=` |
| 7            | `NOT` `!`          |
| 8            | `AND` `&&`         |
| 9            | `OR` `\|\|`        |
| 10 (loosest) | `IF … THEN … ELSE` |

`^` binds tighter than unary minus (`-a^2` is `-(a^2)`) and is right-associative (`a^b^c` is `a^(b^c)`); its right operand accepts a leading sign (`2*10^-6`). `NOT` binds looser than comparisons (`NOT a = b` is `NOT (a = b)`).

---

## Built-in functions

The parser does not validate function names — every `FUNC(...)` becomes a `FunctionCall` AST node, and the IR compiler decides whether the name is meaningful. The table below summarises the built-ins currently evaluable end-to-end. See [@sysdml/ir](../ir/README.md#built-in-functions) for the full registry (including statistical functions whose arities are reserved but not yet evaluated).

| Category          | Functions                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Math (1 arg)      | `ABS` `INT` `SQRT` `EXP` `LN` `LOG10` `SIN` `COS` `TAN` `ARCSIN` `ARCCOS` `ARCTAN` `SIGN`             |
| Math (2/3 args)   | `MIN(a, b)` `MAX(a, b)` `SAFEDIV(value, divisor, default)`                                            |
| Zero-arg          | `TIME` `DT` `STARTTIME` `STOPTIME` `PI` `INF`                                                         |
| Test inputs       | `STEP(height, start)` `RAMP(slope, start)` `PULSE(magnitude, start[, interval])`                      |
| Delay & smoothing | `DELAY1` `DELAY3` `DELAYN` `SMTH1` `SMTH3` `SMTHN` `TREND` `FORCST` — desugared into stocks and flows |
| Memory            | `INIT(x)` `PREVIOUS(x, default)` — evaluated against per-step memory at simulation time               |
| Conditional       | `IF_THEN_ELSE(cond, then, else)` — equivalent to the `IF … THEN … ELSE` keyword form                  |
| Inline lookup     | `LOOKUP(input, y0, y1, …)` — lowered to a synthetic graphical function call                           |

Function names are case-insensitive at the IR level (`SQRT`, `sqrt`, `Sqrt` all match the same built-in).

---

## Full example

```
sfd population_growth

time {
  start: 0
  end:   100
  step:  1
}

stock population {
  init: 100
}

aux birth_rate = 0.02

gf crowding_curve {
  xscale: [0, 200]
  ypts: [1, 0.8, 0.5, 0.2, 0]
}

aux crowding = crowding_curve(population)

gf mortality_curve {
  kind:   linear
  xscale: [0, 200]
  ypts:   [0.01, 0.02, 0.05, 0.1, 0.2]
}

flow births {
  from: null
  to:   population
  rate: population * birth_rate * crowding
}

flow deaths {
  from: population
  to:   null
  rate: IF population > 0 THEN population * mortality_curve(population) ELSE 0
}
```

---

## AST Reference

Every node has a `span: { start: { line, col }, end: { line, col } }` (1-based).

### Top-level

| Node                   | Fields                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `FileNode`             | `model: ModelDeclarationNode`, `submodels: ModelDeclarationNode[]`, `decls: DeclarationNode[]` |
| `ModelDeclarationNode` | `id: string`, `idSpan`                                                                         |

### Declaration nodes (`DeclarationNode`)

| Node                               | Fields                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `TimeDeclarationNode`              | `props: TimePropertyNode[]`                                                                                                |
| `TimePropertyNode`                 | `key: "start" \| "end" \| "step"`, `value: NumberLiteralNode`                                                              |
| `StockDeclarationNode`             | `id: string`, `idSpan`, `props: StockPropertyNode[]`, `position?: PositionNode`                                            |
| `StockPropertyNode`                | `init: ExpressionNode`                                                                                                     |
| `FlowDeclarationNode`              | `id: string`, `idSpan`, `props: FlowPropertyNode[]`, `position?: PositionNode`, `via?: PositionNode[]`                     |
| `FlowPropertyNode`                 | `key: "from" \| "to"`, `value: EndpointNode` — or — `key: "rate"`, `value: ExpressionNode`                                 |
| `EndpointNode`                     | `value: string \| null`                                                                                                    |
| `AuxiliaryDeclarationNode`         | `id: string`, `idSpan`, `expr: ExpressionNode`, `position?: PositionNode`                                                  |
| `GraphicalFunctionDeclarationNode` | `id: string`, `idSpan`, `body: GraphicalFunctionBodyNode`                                                                  |
| `ConnectionDeclarationNode`        | `from: string`, `fromSpan`, `polarity: "+" \| "-" \| "=>"`, `to: string`, `toSpan`, `angle?: number`, `via?: PositionNode` |
| `PositionNode`                     | `x: number`, `y: number`                                                                                                   |

### Graphical function nodes

| Node                            | Fields                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GraphicalFunctionBodyNode`     | `props: GraphicalFunctionPropertyNode[]`                                                                       |
| `GraphicalFunctionPropertyNode` | `key: "kind"`, `value: string` — or — `key: "xscale" \| "xpts" \| "ypts" \| "yscale"`, `value: NumberListNode` |
| `NumberListNode`                | `values: SignedNumberNode[]`                                                                                   |
| `SignedNumberNode`              | `negative: boolean`, `lit: NumberLiteralNode`                                                                  |

### Expression nodes (`ExpressionNode`)

| Node                      | Fields                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `NumberLiteralNode`       | `value: string`                                                                    |
| `IdentifierReferenceNode` | `name: string`                                                                     |
| `GroupedExpressionNode`   | `expr: ExpressionNode`                                                             |
| `UnaryExpressionNode`     | `op: "-" \| "+" \| "NOT"`, `operand: ExpressionNode`                               |
| `BinaryExpressionNode`    | `op: BinaryOperator`, `left: ExpressionNode`, `right: ExpressionNode`              |
| `FunctionCallNode`        | `name: string`, `nameSpan`, `args: ExpressionNode[]`                               |
| `IfThenElseNode`          | `cond: ExpressionNode`, `thenBranch: ExpressionNode`, `elseBranch: ExpressionNode` |

`BinaryOperator` values: `"+"  "-"  "*"  "/"  "^"  "MOD"  "<"  "<="  ">"  ">="  "="  "<>"  "AND"  "OR"`

---

## Credits

Code and documentation co-authored with [Claude Sonnet](https://anthropic.com) and [Claude Opus](https://anthropic.com) by Anthropic.
