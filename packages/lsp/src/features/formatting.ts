import { parseSource } from "@sysdml/parser";
import type {
  FileNode,
  DeclNode,
  ExprNode,
  TimeDeclNode,
  StockDeclNode,
  AuxDeclNode,
  FlowDeclNode,
  ConnectionDeclNode,
  GfDeclNode,
  GfBodyNode,
  NumListNode,
  PosNode,
} from "@sysdml/parser";

export function formatSource(source: string): string | null {
  const { ast, diagnostics } = parseSource(source);
  if (!ast || diagnostics.length > 0) return null;
  return printFile(ast);
}

function printFile(file: FileNode): string {
  const parts: string[] = [`model ${file.model.id}`];
  for (const decl of file.decls) {
    parts.push("");
    parts.push(printDecl(decl));
  }
  return parts.join("\n") + "\n";
}

function printDecl(decl: DeclNode): string {
  switch (decl.type) {
    case "TimeDecl":
      return printTimeDecl(decl);
    case "StockDecl":
      return printStockDecl(decl);
    case "AuxDecl":
      return printAuxDecl(decl);
    case "FlowDecl":
      return printFlowDecl(decl);
    case "ConnectionDecl":
      return printConnectionDecl(decl);
    case "GfDecl":
      return printGfDecl(decl);
  }
}

function printTimeDecl(decl: TimeDeclNode): string {
  const order = ["start", "end", "step"] as const;
  const lines = order.flatMap((key) => {
    const prop = decl.props.find((p) => p.key === key);
    return prop ? [`  ${key}: ${prop.value.value}`] : [];
  });
  return `time {\n${lines.join("\n")}\n}`;
}

function printStockDecl(decl: StockDeclNode): string {
  const initProp = decl.props[0];
  const lines = [
    `stock ${decl.id} {`,
    `  init: ${initProp ? printExpr(initProp.init) : "0"}`,
  ];
  if (decl.position) lines.push(`  position: ${printPos(decl.position)}`);
  lines.push("}");
  return lines.join("\n");
}

function printAuxDecl(decl: AuxDeclNode): string {
  const head = `aux ${decl.id} = ${printExpr(decl.expr)}`;
  if (decl.position === undefined) return head;
  return `${head} { position: ${printPos(decl.position)} }`;
}

function printFlowDecl(decl: FlowDeclNode): string {
  const order = ["from", "to", "rate"] as const;
  const lines: string[] = [];
  for (const key of order) {
    const prop = decl.props.find((p) => p.key === key);
    if (!prop) continue;
    if (key === "from" || key === "to") {
      const endpointProp = prop as Extract<typeof prop, { key: "from" | "to" }>;
      lines.push(`  ${key}: ${endpointProp.value.value ?? "null"}`);
    } else {
      const rateProp = prop as Extract<typeof prop, { key: "rate" }>;
      lines.push(`  ${key}: ${printExpr(rateProp.value)}`);
    }
  }
  if (decl.position) lines.push(`  position: ${printPos(decl.position)}`);
  if (decl.via?.length) lines.push(`  via: ${printPosArray(decl.via)}`);
  return `flow ${decl.id} {\n${lines.join("\n")}\n}`;
}

function printConnectionDecl(decl: ConnectionDeclNode): string {
  const arrow =
    decl.polarity === "+" ? "->+" : decl.polarity === "-" ? "->-" : "=>";
  const base = `${decl.from} ${arrow} ${decl.to}`;
  if (decl.angle === undefined && !decl.via) return base;
  const propLines: string[] = [];
  if (decl.angle !== undefined) propLines.push(`  angle: ${decl.angle}`);
  if (decl.via) propLines.push(`  via: ${printPos(decl.via)}`);
  return `${base} {\n${propLines.join("\n")}\n}`;
}

function printGfDecl(decl: GfDeclNode): string {
  const lines = printGfBodyProps(decl.body);
  return `gf ${decl.id} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
}

function printGfBodyProps(body: GfBodyNode): string[] {
  const order = ["kind", "xscale", "xpts", "ypts", "yscale"] as const;
  return order.flatMap((key) => {
    const prop = body.props.find((p) => p.key === key);
    if (!prop) return [];
    if (prop.key === "kind") return [`kind: ${prop.value}`];
    return [`${prop.key}: ${printNumList(prop.value)}`];
  });
}

function printNumList(list: NumListNode): string {
  const values = list.values.map(
    (signedNumber) =>
      `${signedNumber.negative ? "-" : ""}${signedNumber.lit.value}`,
  );
  return `[${values.join(", ")}]`;
}

function printPos(pos: PosNode): string {
  return `{ x: ${pos.x}, y: ${pos.y} }`;
}

function printPosArray(positions: PosNode[]): string {
  return `[${positions.map(printPos).join(", ")}]`;
}

function printExpr(expr: ExprNode): string {
  switch (expr.type) {
    case "NumberLit":
      return expr.value;
    case "IdentRef":
      return expr.name;
    case "GroupedExpr":
      return `(${printExpr(expr.expr)})`;
    case "BinaryExpr":
      return `${printExpr(expr.left)} ${expr.op} ${printExpr(expr.right)}`;
    case "UnaryExpr":
      return expr.op === "NOT"
        ? `NOT ${printExpr(expr.operand)}`
        : `${expr.op}${printExpr(expr.operand)}`;
    case "FunctionCall":
      return `${expr.name}(${expr.args.map(printExpr).join(", ")})`;
    case "IfThenElse":
      return `IF ${printExpr(expr.cond)} THEN ${printExpr(expr.thenBranch)} ELSE ${printExpr(expr.elseBranch)}`;
  }
}
