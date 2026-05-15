import { describe, test, expect } from 'vitest';
import { evalBuiltin } from '../src/functions.js';
import { SimDiagnosticCode, SimulationHaltedError } from '../src/types.js';

const noCtx = { t: 0, start: 0, end: 10, step: 1 };

describe('evalBuiltin — math functions', () => {
  test('ABS(-5) → 5', () => expect(evalBuiltin('ABS', [-5], noCtx)).toBe(5));
  test('ABS(3) → 3', () => expect(evalBuiltin('ABS', [3], noCtx)).toBe(3));
  test('INT(3.9) → 3', () => expect(evalBuiltin('INT', [3.9], noCtx)).toBe(3));
  test('INT(-1.5) → -2 (floor, not truncate)', () => expect(evalBuiltin('INT', [-1.5], noCtx)).toBe(-2));
  test('SQRT(4) → 2', () => expect(evalBuiltin('SQRT', [4], noCtx)).toBe(2));
  test('SQRT(0) → 0 (zero allowed)', () => expect(evalBuiltin('SQRT', [0], noCtx)).toBe(0));
  test('SQRT(-1) throws MATH_DOMAIN_ERROR (out of real domain)', () =>
    expect(() => evalBuiltin('SQRT', [-1], noCtx)).toThrow(SimulationHaltedError));
  test('EXP(0) → 1', () => expect(evalBuiltin('EXP', [0], noCtx)).toBe(1));
  test('EXP(1) → e', () => expect(evalBuiltin('EXP', [1], noCtx)).toBeCloseTo(Math.E));
  test('LN(1) → 0', () => expect(evalBuiltin('LN', [1], noCtx)).toBe(0));
  test('LN(0) throws MATH_DOMAIN_ERROR (XMILE: domain is (0, ∞))', () =>
    expect(() => evalBuiltin('LN', [0], noCtx)).toThrow(SimulationHaltedError));
  test('LN(-1) throws MATH_DOMAIN_ERROR', () =>
    expect(() => evalBuiltin('LN', [-1], noCtx)).toThrow(SimulationHaltedError));
  test('LOG10(100) → 2', () => expect(evalBuiltin('LOG10', [100], noCtx)).toBeCloseTo(2));
  test('LOG10(0) throws MATH_DOMAIN_ERROR', () =>
    expect(() => evalBuiltin('LOG10', [0], noCtx)).toThrow(SimulationHaltedError));
  test('LOG10(-1) throws MATH_DOMAIN_ERROR', () =>
    expect(() => evalBuiltin('LOG10', [-1], noCtx)).toThrow(SimulationHaltedError));
  test('domain error carries MATH_DOMAIN_ERROR code and offending value', () => {
    try {
      evalBuiltin('LN', [0], noCtx);
      throw new Error('expected SimulationHaltedError');
    } catch (err) {
      expect(err).toBeInstanceOf(SimulationHaltedError);
      const halt = err as SimulationHaltedError;
      expect(halt.diagnostic.code).toBe(SimDiagnosticCode.MATH_DOMAIN_ERROR);
      expect(halt.diagnostic.message).toContain('LN(0)');
    }
  });
  test('SIN(0) → 0', () => expect(evalBuiltin('SIN', [0], noCtx)).toBeCloseTo(0));
  test('COS(0) → 1', () => expect(evalBuiltin('COS', [0], noCtx)).toBeCloseTo(1));
  test('TAN(0) → 0', () => expect(evalBuiltin('TAN', [0], noCtx)).toBeCloseTo(0));
  test('ARCSIN(1) → π/2', () => expect(evalBuiltin('ARCSIN', [1], noCtx)).toBeCloseTo(Math.PI / 2));
  test('ARCCOS(1) → 0', () => expect(evalBuiltin('ARCCOS', [1], noCtx)).toBeCloseTo(0));
  test('ARCTAN(1) → π/4', () => expect(evalBuiltin('ARCTAN', [1], noCtx)).toBeCloseTo(Math.PI / 4));
  test('MIN(3, 7) → 3', () => expect(evalBuiltin('MIN', [3, 7], noCtx)).toBe(3));
  test('MAX(3, 7) → 7', () => expect(evalBuiltin('MAX', [3, 7], noCtx)).toBe(7));
});

describe('evalBuiltin — constants', () => {
  test('PI → Math.PI', () => expect(evalBuiltin('PI', [], noCtx)).toBe(Math.PI));
  test('INF → Infinity', () => expect(evalBuiltin('INF', [], noCtx)).toBe(Infinity));
});

describe('evalBuiltin — simulation time accessors', () => {
  const ctx = { t: 5, start: 0, end: 100, step: 0.25 };
  test('TIME returns ctx.t', () => expect(evalBuiltin('TIME', [], ctx)).toBe(5));
  test('DT returns ctx.step', () => expect(evalBuiltin('DT', [], ctx)).toBe(0.25));
  test('STARTTIME returns ctx.start', () => expect(evalBuiltin('STARTTIME', [], ctx)).toBe(0));
  test('STOPTIME returns ctx.end', () => expect(evalBuiltin('STOPTIME', [], ctx)).toBe(100));
});

describe('evalBuiltin — STEP', () => {
  const ctx = { t: 0, start: 0, end: 10, step: 1 };
  test('before start_time returns 0', () => expect(evalBuiltin('STEP', [5, 3], { ...ctx, t: 2 })).toBe(0));
  test('at start_time returns height (inclusive)', () => expect(evalBuiltin('STEP', [5, 3], { ...ctx, t: 3 })).toBe(5));
  test('after start_time returns height', () => expect(evalBuiltin('STEP', [5, 3], { ...ctx, t: 7 })).toBe(5));
});

describe('evalBuiltin — RAMP', () => {
  const ctx = { t: 0, start: 0, end: 10, step: 1 };
  test('before start_time returns 0', () => expect(evalBuiltin('RAMP', [2, 3], { ...ctx, t: 2 })).toBe(0));
  test('at start_time returns 0', () => expect(evalBuiltin('RAMP', [2, 3], { ...ctx, t: 3 })).toBeCloseTo(0));
  test('one unit after start_time returns slope', () => expect(evalBuiltin('RAMP', [2, 3], { ...ctx, t: 4 })).toBeCloseTo(2));
  test('two units after returns 2*slope', () => expect(evalBuiltin('RAMP', [2, 3], { ...ctx, t: 5 })).toBeCloseTo(4));
});

describe('evalBuiltin — PULSE', () => {
  const ctx = { t: 0, start: 0, end: 10, step: 1 };
  test('single fire at first_time: returns magnitude/DT', () => {
    expect(evalBuiltin('PULSE', [3, 2, 0], { ...ctx, t: 2 })).toBeCloseTo(3 / 1);
  });
  test('single fire: returns 0 one step later', () => {
    expect(evalBuiltin('PULSE', [3, 2, 0], { ...ctx, t: 3 })).toBe(0);
  });
  test('before first_time returns 0', () => {
    expect(evalBuiltin('PULSE', [3, 5, 0], { ...ctx, t: 3 })).toBe(0);
  });
  test('repeating: fires at first_time', () => {
    expect(evalBuiltin('PULSE', [1, 2, 3], { ...ctx, t: 2 })).toBeCloseTo(1 / 1);
  });
  test('repeating: fires at first_time + interval', () => {
    expect(evalBuiltin('PULSE', [1, 2, 3], { ...ctx, t: 5 })).toBeCloseTo(1 / 1);
  });
  test('repeating: zero between fires', () => {
    expect(evalBuiltin('PULSE', [1, 2, 3], { ...ctx, t: 3 })).toBe(0);
  });
  test('interval < DT (D3): fires every step from first_time', () => {
    const smallInterval = { t: 5, start: 0, end: 10, step: 1 };
    expect(evalBuiltin('PULSE', [1, 2, 0.1], smallInterval)).toBeCloseTo(1 / 1);
  });
});

describe('evalBuiltin — SIGN', () => {
  test('SIGN(5) → 1',  () => expect(evalBuiltin('SIGN', [5], noCtx)).toBe(1));
  test('SIGN(-3) → -1', () => expect(evalBuiltin('SIGN', [-3], noCtx)).toBe(-1));
  test('SIGN(0) → 0',  () => expect(evalBuiltin('SIGN', [0], noCtx)).toBe(0));
});

describe('evalBuiltin — SAFEDIV', () => {
  test('SAFEDIV(10, 2, 99) → 5',         () => expect(evalBuiltin('SAFEDIV', [10, 2, 99], noCtx)).toBe(5));
  test('SAFEDIV(10, 0, 99) → 99 (fallback)', () => expect(evalBuiltin('SAFEDIV', [10, 0, 99], noCtx)).toBe(99));
  test('SAFEDIV(0, 0, -1) → -1',         () => expect(evalBuiltin('SAFEDIV', [0, 0, -1], noCtx)).toBe(-1));
});
