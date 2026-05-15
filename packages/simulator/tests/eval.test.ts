import { describe, test, expect } from 'vitest';
import { evalExpr } from '../src/eval.js';
import type { EvalContext, Env } from '../src/types.js';
import type { IRExpressionNode, IRGraphicalFunction } from '@sysdml/ir';

function makeCtx(env: Env = {}, t = 0): EvalContext {
  const sim = { t, start: 0, end: 10, step: 1 };
  return { env, sim, initEnv: env, prevEnv: env, gfRegistry: new Map() };
}

describe('evalExpr — literals and refs', () => {
  test('Num returns value', () => {
    expect(evalExpr({ type: 'Number', value: 42 }, makeCtx())).toBe(42);
  });

  test('Ref returns env value', () => {
    expect(evalExpr({ type: 'Reference', id: 'x' }, makeCtx({ x: 7 }))).toBe(7);
  });

  test('Ref returns 0 for unknown id', () => {
    expect(evalExpr({ type: 'Reference', id: 'missing' }, makeCtx())).toBe(0);
  });
});

describe('evalExpr — unary ops', () => {
  test('UnaryMinus negates', () => {
    expect(evalExpr({ type: 'UnaryMinus', operand: { type: 'Number', value: 5 } }, makeCtx())).toBe(-5);
  });

  test('Not of 0 returns 1', () => {
    expect(evalExpr({ type: 'Not', operand: { type: 'Number', value: 0 } }, makeCtx())).toBe(1);
  });

  test('Not of non-zero returns 0', () => {
    expect(evalExpr({ type: 'Not', operand: { type: 'Number', value: 7 } }, makeCtx())).toBe(0);
  });
});

describe('evalExpr — BinOp arithmetic', () => {
  function bin(op: string, left: number, right: number): number {
    return evalExpr(
      { type: 'BinaryOperation', op: op as never, left: { type: 'Number', value: left }, right: { type: 'Number', value: right } },
      makeCtx(),
    );
  }

  test('addition', () => expect(bin('+', 3, 4)).toBe(7));
  test('subtraction', () => expect(bin('-', 10, 3)).toBe(7));
  test('multiplication', () => expect(bin('*', 3, 4)).toBe(12));
  test('division', () => expect(bin('/', 10, 4)).toBe(2.5));
  test('division by zero → Infinity (D1)', () => expect(bin('/', 1, 0)).toBe(Infinity));
  test('exponentiation', () => expect(bin('^', 2, 8)).toBe(256));
  test('MOD 7 MOD 3 → 1', () => expect(bin('MOD', 7, 3)).toBe(1));
  test('MOD -7 MOD 3 → 2 (floored, sign follows divisor)', () => expect(bin('MOD', -7, 3)).toBe(2));
});

describe('evalExpr — BinOp comparisons return 0 or 1', () => {
  function cmp(op: string, left: number, right: number): number {
    return evalExpr(
      { type: 'BinaryOperation', op: op as never, left: { type: 'Number', value: left }, right: { type: 'Number', value: right } },
      makeCtx(),
    );
  }
  test('3 < 5 → 1', () => expect(cmp('<', 3, 5)).toBe(1));
  test('5 < 3 → 0', () => expect(cmp('<', 5, 3)).toBe(0));
  test('3 = 3 → 1', () => expect(cmp('=', 3, 3)).toBe(1));
  test('3 <> 4 → 1', () => expect(cmp('<>', 3, 4)).toBe(1));
  test('AND: 1 AND 0 → 0', () => expect(cmp('AND', 1, 0)).toBe(0));
  test('OR: 0 OR 1 → 1', () => expect(cmp('OR', 0, 1)).toBe(1));
});

describe('evalExpr — IfThenElse (eager)', () => {
  test('truthy condition picks then branch', () => {
    const node: IRExpressionNode = {
      type: 'IfThenElse',
      cond: { type: 'Number', value: 1 },
      thenBranch: { type: 'Number', value: 10 },
      elseBranch: { type: 'Number', value: 20 },
    };
    expect(evalExpr(node, makeCtx())).toBe(10);
  });

  test('zero condition picks else branch', () => {
    const node: IRExpressionNode = {
      type: 'IfThenElse',
      cond: { type: 'Number', value: 0 },
      thenBranch: { type: 'Number', value: 10 },
      elseBranch: { type: 'Number', value: 20 },
    };
    expect(evalExpr(node, makeCtx())).toBe(20);
  });

  test('dead branch with 1/0 does not throw (eager evaluation, result discarded)', () => {
    const node: IRExpressionNode = {
      type: 'IfThenElse',
      cond: { type: 'Number', value: 1 },
      thenBranch: { type: 'Number', value: 5 },
      elseBranch: { type: 'BinaryOperation', op: '/', left: { type: 'Number', value: 1 }, right: { type: 'Number', value: 0 } },
    };
    expect(() => evalExpr(node, makeCtx())).not.toThrow();
    expect(evalExpr(node, makeCtx())).toBe(5);
  });
});

describe('evalExpr — GFCall dispatches to gfLookup', () => {
  test('linear GF midpoint', () => {
    const gf: IRGraphicalFunction = { id: 'f', kind: 'linear', xscale: [0, 1], xpts: null, ypts: [0, 1], yscale: null };
    const sim = { t: 0, start: 0, end: 10, step: 1 };
    const env = { x: 0.5 };
    const gfMap = new Map<string, IRGraphicalFunction>();
    gfMap.set('f', gf);
    const ctx: EvalContext = { env, sim, initEnv: env, prevEnv: env, gfRegistry: gfMap };
    const node: IRExpressionNode = { type: 'GraphicalFunctionCall', name: 'f', argument: { type: 'Reference', id: 'x' } };
    expect(evalExpr(node, ctx)).toBeCloseTo(0.5);
  });
});

describe('evalExpr — deferred v0.2 functions throw', () => {
  test('RANDOM throws with v0.2 message', () => {
    const node: IRExpressionNode = { type: 'FunctionCall', name: 'RANDOM', args: [{ type: 'Number', value: 0 }, { type: 'Number', value: 1 }] };
    expect(() => evalExpr(node, makeCtx())).toThrow('v0.2');
  });

  test('DELAY throws with v0.2 message', () => {
    const node: IRExpressionNode = { type: 'FunctionCall', name: 'DELAY', args: [{ type: 'Number', value: 1 }, { type: 'Number', value: 2 }] };
    expect(() => evalExpr(node, makeCtx())).toThrow('v0.2');
  });
});
