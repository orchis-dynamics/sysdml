import { describe, test, expect } from 'vitest';
import { parseSource } from '@sysdml/parser';
import { compileAST } from '@sysdml/ir';
import { EulerSimulator } from '../src/index.js';

const _simulator = new EulerSimulator();

/** Compile and simulate a single-aux model where `result = exprSrc`. Returns first row's result. */
function evalAux(exprSrc: string, extraAux: Record<string, string> = {}): number {
  const auxLines = Object.entries(extraAux).map(([id, e]) => `aux ${id} = ${e}`).join('\n');
  const src = `
model m
time { start: 0 end: 0 step: 1 }
stock s { init: 0 }
${auxLines}
aux result = ${exprSrc}
`;
  const { ast, diagnostics: parseDiag } = parseSource(src);
  if (parseDiag.length > 0) throw new Error(`Parse: ${parseDiag[0].message}`);
  const { ir, diagnostics: irDiag } = compileAST(ast!);
  if (irDiag.length > 0) throw new Error(`IR: ${irDiag[0].message}`);
  return _simulator.simulate(ir!).rows[0].result;
}

// ── Comparison operators ──────────────────────────────────────────────────────

describe('comparison operators evaluate correctly', () => {
  test('5 > 3 → 1', () => expect(evalAux('5 > 3')).toBe(1));
  test('5 < 3 → 0', () => expect(evalAux('5 < 3')).toBe(0));
  test('5 >= 5 → 1', () => expect(evalAux('5 >= 5')).toBe(1));
  test('5 <= 4 → 0', () => expect(evalAux('5 <= 4')).toBe(0));
  test('0 = 0 → 1', () => expect(evalAux('0 = 0')).toBe(1));
  test('1 <> 1 → 0', () => expect(evalAux('1 <> 1')).toBe(0));
  test('1 <> 2 → 1', () => expect(evalAux('1 <> 2')).toBe(1));
});

// ── Logical operators (truthiness: 0 = false, anything else = true) ──────────

describe('logical operators evaluate correctly', () => {
  test('NOT 0 → 1', () => expect(evalAux('NOT 0')).toBe(1));
  test('NOT 5 → 0', () => expect(evalAux('NOT 5')).toBe(0));
  test('NOT (0 - 0) → 1 (zero is falsy)', () => expect(evalAux('NOT (0 - 0)')).toBe(1));

  test('1 AND 1 → 1', () => expect(evalAux('1 AND 1')).toBe(1));
  test('1 AND 0 → 0', () => expect(evalAux('1 AND 0')).toBe(0));
  test('0 AND 1 → 0', () => expect(evalAux('0 AND 1')).toBe(0));
  test('5 AND 7 → 1 (any non-zero is true)', () => expect(evalAux('5 AND 7')).toBe(1));

  test('1 OR 0 → 1', () => expect(evalAux('1 OR 0')).toBe(1));
  test('0 OR 0 → 0', () => expect(evalAux('0 OR 0')).toBe(0));
  test('0 OR 5 → 1', () => expect(evalAux('0 OR 5')).toBe(1));
});

// ── IF/THEN/ELSE ─────────────────────────────────────────────────────────────

describe('IF/THEN/ELSE evaluation', () => {
  test('IF 1 THEN 10 ELSE 20 → 10', () => {
    expect(evalAux('IF 1 THEN 10 ELSE 20')).toBe(10);
  });

  test('IF 0 THEN 10 ELSE 20 → 20', () => {
    expect(evalAux('IF 0 THEN 10 ELSE 20')).toBe(20);
  });

  test('non-zero condition is truthy: IF -3 THEN 10 ELSE 20 → 10', () => {
    expect(evalAux('IF -3 THEN 10 ELSE 20')).toBe(10);
  });

  test('IF a > 5 THEN a ELSE 0 with a=7 → 7', () => {
    expect(evalAux('IF a > 5 THEN a ELSE 0', { a: '7' })).toBe(7);
  });

  test('IF a > 5 THEN a ELSE 0 with a=3 → 0', () => {
    expect(evalAux('IF a > 5 THEN a ELSE 0', { a: '3' })).toBe(0);
  });
});

// ── IF_THEN_ELSE function form ────────────────────────────────────────────────

describe('IF_THEN_ELSE function form simulates identically', () => {
  test('IF_THEN_ELSE(1, 10, 20) → 10', () => {
    expect(evalAux('IF_THEN_ELSE(1, 10, 20)')).toBe(10);
  });

  test('IF_THEN_ELSE(0, 10, 20) → 20', () => {
    expect(evalAux('IF_THEN_ELSE(0, 10, 20)')).toBe(20);
  });

  test('IF_THEN_ELSE(c, t, e) ≡ IF c THEN t ELSE e for several inputs', () => {
    for (const [c, t, e] of [[1, 10, 20], [0, 10, 20], [-1, 5, 9], [0, 0, 0]] as const) {
      const fn = evalAux(`IF_THEN_ELSE(${c}, ${t}, ${e})`);
      const kw = evalAux(`IF ${c} THEN ${t} ELSE ${e}`);
      expect(fn).toBe(kw);
    }
  });
});

// ── Exponentiation (^) ───────────────────────────────────────────────────────

describe('exponentiation evaluates correctly', () => {
  test('2 ^ 3 → 8', () => expect(evalAux('2 ^ 3')).toBe(8));
  test('4 ^ 0.5 → 2', () => expect(evalAux('4 ^ 0.5')).toBe(2));
  test('2 ^ 3 ^ 2 → 512 (right-assoc: 2^(3^2) = 2^9)', () => expect(evalAux('2 ^ 3 ^ 2')).toBe(512));
  test('-2 ^ 2 → -4 (unary minus binds less tightly than ^)', () => expect(evalAux('-2 ^ 2')).toBe(-4));
  test('a ^ b with a=3 b=4 → 81', () => expect(evalAux('a ^ b', { a: '3', b: '4' })).toBe(81));
});

// ── Unary plus ────────────────────────────────────────────────────────────────

describe('unary plus evaluates correctly', () => {
  test('+5 → 5', () => expect(evalAux('+5')).toBe(5));
  test('+-3 → -3', () => expect(evalAux('+-3')).toBe(-3));
  test('+a with a=7 → 7', () => expect(evalAux('+a', { a: '7' })).toBe(7));
});

// ── MOD operator ─────────────────────────────────────────────────────────────

describe('MOD evaluates with Knuth floored semantics', () => {
  test('7 MOD 3 → 1', () => expect(evalAux('7 MOD 3')).toBe(1));
  test('0 MOD 5 → 0', () => expect(evalAux('0 MOD 5')).toBe(0));
  test('-7 MOD 3 → 2 (sign follows divisor)', () => expect(evalAux('-7 MOD 3')).toBe(2));
  test('7 MOD -3 → -2 (sign follows divisor)', () => expect(evalAux('7 MOD -3')).toBe(-2));
  test('-7 MOD -3 → -1 (both negative, sign follows divisor)', () => expect(evalAux('-7 MOD -3')).toBe(-1));
});

// ── Precedence under simulation ──────────────────────────────────────────────

describe('precedence under simulation', () => {
  test('1 + 2 < 5 → 1 (additive binds tighter than relational)', () => {
    expect(evalAux('1 + 2 < 5')).toBe(1);
  });

  test('NOT 0 OR 0 → 1', () => {
    expect(evalAux('NOT 0 OR 0')).toBe(1);
  });

  test('IF 1 > 0 AND 2 > 1 THEN 100 ELSE 0 → 100', () => {
    expect(evalAux('IF 1 > 0 AND 2 > 1 THEN 100 ELSE 0')).toBe(100);
  });
});

// ── Eager evaluation (XMILE-strict) ───────────────────────────────────────────

describe('eager evaluation', () => {
  test('IF/THEN/ELSE evaluates both branches — 1/0 in dead branch yields Infinity but does not throw', () => {
    expect(() => evalAux('IF 1 THEN 5 ELSE 1 / 0')).not.toThrow();
    expect(evalAux('IF 1 THEN 5 ELSE 1 / 0')).toBe(5);
  });

  test('AND evaluates both operands eagerly', () => {
    expect(() => evalAux('0 AND 1 / 0')).not.toThrow();
    expect(evalAux('0 AND 1 / 0')).toBe(0);
  });
});
