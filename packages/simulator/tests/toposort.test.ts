import { describe, test, expect } from 'vitest';
import { toposort } from '../src/toposort.js';
import type { IRAux, IRExprNode } from '@sysdml/ir';

function num(value: number): IRExprNode {
  return { type: 'Num', value };
}

function ref(id: string): IRExprNode {
  return { type: 'Ref', id };
}

function binop(left: IRExprNode, right: IRExprNode): IRExprNode {
  return { type: 'BinOp', op: '+', left, right };
}

function aux(id: string, expr: IRExprNode): IRAux {
  return { id, expr };
}

describe('toposort — independent aux', () => {
  test('single aux returned as-is', () => {
    const { orderedAux, diagnostics } = toposort([aux('a', num(1))], []);
    expect(diagnostics).toHaveLength(0);
    expect(orderedAux.map(a => a.id)).toEqual(['a']);
  });

  test('two independent aux preserve input order', () => {
    const { orderedAux } = toposort([aux('a', num(1)), aux('b', num(2))], []);
    expect(orderedAux.map(a => a.id)).toEqual(['a', 'b']);
  });
});

describe('toposort — dependency ordering', () => {
  test('b depends on a: [b,a] → a before b', () => {
    const { orderedAux, diagnostics } = toposort(
      [aux('b', ref('a')), aux('a', num(1))],
      [],
    );
    expect(diagnostics).toHaveLength(0);
    const ids = orderedAux.map(a => a.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
  });

  test('chain a→b→c in wrong order resolves correctly', () => {
    const { orderedAux, diagnostics } = toposort(
      [aux('c', ref('b')), aux('b', ref('a')), aux('a', num(1))],
      [],
    );
    expect(diagnostics).toHaveLength(0);
    const ids = orderedAux.map(a => a.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  test('diamond dependency: a→b, a→c, b+c→d', () => {
    const { orderedAux, diagnostics } = toposort(
      [
        aux('d', binop(ref('b'), ref('c'))),
        aux('c', ref('a')),
        aux('b', ref('a')),
        aux('a', num(1)),
      ],
      [],
    );
    expect(diagnostics).toHaveLength(0);
    const ids = orderedAux.map(a => a.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'));
    expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'));
  });

  test('ref to stock id is not treated as aux dependency', () => {
    // 'population' is a stock, not in aux list — sort should ignore it
    const { orderedAux, diagnostics } = toposort(
      [aux('b', ref('a')), aux('a', ref('population'))],
      [],
    );
    expect(diagnostics).toHaveLength(0);
    const ids = orderedAux.map(a => a.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
  });
});

describe('toposort — cycle detection', () => {
  test('direct cycle a↔b emits CYCLE_IN_AUX', () => {
    const { diagnostics } = toposort(
      [aux('a', ref('b')), aux('b', ref('a'))],
      [],
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('CYCLE_IN_AUX');
  });

  test('cycle still returns all aux (fallback order)', () => {
    const { orderedAux } = toposort(
      [aux('a', ref('b')), aux('b', ref('a'))],
      [],
    );
    expect(orderedAux).toHaveLength(2);
  });
});
