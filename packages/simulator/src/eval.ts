import type { IRBinOp, IRExprNode } from '@sysdml/ir';
import type { EvalContext } from './types.js';
import { gfLookup } from './gf.js';
import { evalBuiltin } from './functions.js';

const DEFERRED_V2_FUNCTIONS = new Set([
  'RANDOM', 'NORMAL', 'LOGNORMAL', 'EXPRND', 'POISSON', 'DELAY',
]);

export function evalExpr(node: IRExprNode, evalCtx: EvalContext): number {
  switch (node.type) {
    case 'Num':          return node.value;
    case 'Ref':          return evalCtx.env[node.id] ?? 0;
    case 'UnaryMinus':   return -evalExpr(node.operand, evalCtx);
    case 'Not':          return evalExpr(node.operand, evalCtx) === 0 ? 1 : 0;
    case 'BinOp':        return evalBinOp(node.op, evalExpr(node.left, evalCtx), evalExpr(node.right, evalCtx));
    case 'IfThenElse':   return evalIfThenElse(node.cond, node.thenBranch, node.elseBranch, evalCtx);
    case 'GFCall':       return evalGFCall(node.name, node.argument, evalCtx);
    case 'FunctionCall': return evalFunctionCall(node.name, node.args, evalCtx);
  }
}

function evalBinOp(op: IRBinOp, left: number, right: number): number {
  switch (op) {
    case '+':   return left + right;
    case '-':   return left - right;
    case '*':   return left * right;
    case '/':   return left / right;
    case '^':   return Math.pow(left, right);
    case 'MOD': return flooredMod(left, right);
    case '<':   return left <  right ? 1 : 0;
    case '<=':  return left <= right ? 1 : 0;
    case '>':   return left >  right ? 1 : 0;
    case '>=':  return left >= right ? 1 : 0;
    case '=':   return left === right ? 1 : 0;
    case '<>':  return left !== right ? 1 : 0;
    case 'AND': return left !== 0 && right !== 0 ? 1 : 0;
    case 'OR':  return left !== 0 || right !== 0 ? 1 : 0;
    default: {
      const exhaustive: never = op;
      throw new Error(`Unknown binary operator: ${exhaustive}`);
    }
  }
}

function flooredMod(dividend: number, divisor: number): number {
  const remainder = dividend % divisor;
  if (remainder === 0) return 0;
  return remainder + (Math.sign(remainder) !== Math.sign(divisor) ? divisor : 0);
}

function evalIfThenElse(
  cond: IRExprNode,
  thenBranch: IRExprNode,
  elseBranch: IRExprNode,
  evalCtx: EvalContext,
): number {
  const condValue = evalExpr(cond, evalCtx);
  const thenValue = evalExpr(thenBranch, evalCtx);
  const elseValue = evalExpr(elseBranch, evalCtx);
  return condValue !== 0 ? thenValue : elseValue;
}

function evalGFCall(name: string, argNode: IRExprNode, evalCtx: EvalContext): number {
  const graphicalFunction = evalCtx.gfRegistry.get(name);
  if (graphicalFunction === undefined) throw new Error(`Unknown graphical function '${name}'`);
  return gfLookup(graphicalFunction, evalExpr(argNode, evalCtx));
}

function evalFunctionCall(
  name: string,
  argNodes: readonly IRExprNode[],
  evalCtx: EvalContext,
): number {
  if (name === 'INIT')     return evalInit(argNodes, evalCtx);
  if (name === 'PREVIOUS') return evalPrevious(argNodes, evalCtx);

  if (DEFERRED_V2_FUNCTIONS.has(name)) {
    throw new Error(`${name} is not available in v0.1 — deferred to v0.2`);
  }

  const args = argNodes.map(argNode => evalExpr(argNode, evalCtx));
  return evalBuiltin(name, args, evalCtx.sim);
}

function evalInit(argNodes: readonly IRExprNode[], evalCtx: EvalContext): number {
  const argNode = argNodes[0];
  if (argNode.type !== 'Ref') {
    throw new Error('INIT requires a bare identifier argument');
  }
  return evalCtx.initEnv[argNode.id] ?? 0;
}

function evalPrevious(argNodes: readonly IRExprNode[], evalCtx: EvalContext): number {
  const xNode = argNodes[0];
  if (xNode.type !== 'Ref') {
    throw new Error('PREVIOUS first argument must be a bare identifier');
  }
  if (evalCtx.sim.t === evalCtx.sim.start) {
    return evalExpr(argNodes[1], evalCtx);
  }
  return evalCtx.prevEnv[xNode.id] ?? 0;
}
