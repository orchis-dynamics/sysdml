# @sysdml/parser

ANTLR4 TypeScript parser for SYSDML. Converts source text into a typed AST covering Stock-and-Flow Diagram (SFD) and Causal Loop Diagram (CLD) syntax.

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
model <id>
```

### Time block

```
time {
  start: <number>
  end:   <number>
  step:  <number>
}
```

### Stock

```
stock <id> {
  init: <expr>
}
```

### Flow

`from` and `to` accept either an identifier or `null` (open endpoint).

```
flow <id> {
  from: <id> | null
  to:   <id> | null
  rate: <expr>
}
```

### Aux

The general form is an identifier bound to an expression:

```
aux <id> = <expr>
```

For graphical aux, call either a named `gf` (see below) or the inline `lookup()` built-in:

```
aux <id> = my_curve(<expr>)
aux <id> = lookup(<expr>, <y0>, <y1>, …)
```

An optional trailing metadata block carries layout information:

```
aux <id> = <expr> { position: { x: <num>, y: <num> } }
```

### Graphical function (named)

A standalone named lookup table that can be called as a function in expressions.

```
gf <id> {
  kind:   linear | extra | step   # optional, default linear
  xscale: [<min>, <max>]          # domain bounds (use with ypts)
  xpts:   [<n>, ...]              # explicit x values (alternative to xscale)
  ypts:   [<n>, ...]              # output values (required)
  yscale: [<min>, <max>]          # optional range bounds
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

---

## Expressions

Expressions appear in `aux`, `stock init`, and `flow rate`.

### Literals and references

| Syntax               | Meaning              |
| -------------------- | -------------------- |
| `42`, `3.14`         | Number literal (integer or decimal). Scientific notation is not supported — write `2*10^-6` instead. |
| `population`         | Identifier reference |

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

The parser accepts any identifier as a function name; unknown names are rejected at a later compiler stage.

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

| Level        | Operators               |
| ------------ | ----------------------- |
| 1 (tightest) | Unary `-` `+` `NOT` `!` |
| 2            | `^`                     |
| 3            | `*` `/` `MOD`           |
| 4            | `+` `-`                 |
| 5            | `<` `<=` `>` `>=`       |
| 6            | `=` `<>` `==` `!=`      |
| 7            | `AND` `&&`              |
| 8            | `OR` `\|\|`             |
| 9 (loosest)  | `IF … THEN … ELSE`      |

---

## Full example

```
model population_growth

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

| Node            | Fields                                      |
| --------------- | ------------------------------------------- |
| `FileNode`      | `model: ModelDeclNode`, `decls: DeclNode[]` |
| `ModelDeclNode` | `id: string`, `idSpan`                      |

### Declaration nodes (`DeclNode`)

| Node                 | Fields                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TimeDeclNode`       | `props: TimePropNode[]`                                                                                                                                       |
| `TimePropNode`       | `key: "start" \| "end" \| "step"`, `value: NumberLitNode`                                                                                                     |
| `StockDeclNode`      | `id: string`, `idSpan`, `props: StockPropNode[]`                                                                                                              |
| `StockPropNode`      | `init: ExprNode`                                                                                                                                              |
| `FlowDeclNode`       | `id: string`, `idSpan`, `props: FlowPropNode[]`                                                                                                               |
| `FlowPropNode`       | `key: "from" \| "to"`, `value: EndpointNode` — or — `key: "rate"`, `value: ExprNode`                                                                          |
| `EndpointNode`       | `value: string \| null`                                                                                                                                       |
| `AuxDeclNode`        | `id: string`, `idSpan`, `expr: ExprNode`, `position?: PosNode` |
| `GfDeclNode`         | `id: string`, `idSpan`, `body: GfBodyNode`                                                                                                                    |
| `ConnectionDeclNode` | `from: string`, `fromSpan`, `polarity: "+" \| "-" \| "=>"`, `to: string`, `toSpan`                                                                            |

### Graphical function nodes

| Node               | Fields                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `GfBodyNode`       | `props: GfPropNode[]`                                                                                       |
| `GfPropNode`       | `key: "kind"`, `value: string` — or — `key: "xscale" \| "xpts" \| "ypts" \| "yscale"`, `value: NumListNode` |
| `NumListNode`      | `values: SignedNumberNode[]`                                                                                |
| `SignedNumberNode` | `negative: boolean`, `lit: NumberLitNode`                                                                   |

### Expression nodes (`ExprNode`)

| Node               | Fields                                                           |
| ------------------ | ---------------------------------------------------------------- |
| `NumberLitNode`    | `value: string`                                                  |
| `IdentRefNode`     | `name: string`                                                   |
| `GroupedExprNode`  | `expr: ExprNode`                                                 |
| `UnaryExprNode`    | `op: "-" \| "+" \| "NOT"`, `operand: ExprNode`                   |
| `BinaryExprNode`   | `op: BinaryOp`, `left: ExprNode`, `right: ExprNode`              |
| `FunctionCallNode` | `name: string`, `nameSpan`, `args: ExprNode[]`                   |
| `IfThenElseNode`   | `cond: ExprNode`, `thenBranch: ExprNode`, `elseBranch: ExprNode` |

`BinaryOp` values: `"+"  "-"  "*"  "/"  "^"  "MOD"  "<"  "<="  ">"  ">="  "="  "<>"  "AND"  "OR"`

---

## Credits

Code and documentation co-authored with [Claude Sonnet](https://anthropic.com) and [Claude Opus](https://anthropic.com) by Anthropic.
