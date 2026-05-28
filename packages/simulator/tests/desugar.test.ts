import { describe, test, expect } from 'vitest';
import { desugarIR } from '../src/desugar.js';
import { buildIR } from './helpers.js';

describe('desugarIR — DELAY1 structural changes', () => {
  test('adds one hidden stock per DELAY1 call', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux delayed = DELAY1(population, 3)
    `);
    const { ir: desugared, diagnostics } = desugarIR(ir);
    expect(diagnostics).toHaveLength(0);
    expect(desugared.stocks.length).toBe(ir.stocks.length + 1);
    const hidden = desugared.stocks.find(s => s.id.startsWith('_delay1'));
    expect(hidden).toBeDefined();
  });

  test('adds one hidden flow per DELAY1 call', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux delayed = DELAY1(population, 3)
    `);
    const { ir: desugared } = desugarIR(ir);
    expect(desugared.flows.length).toBe(ir.flows.length + 1);
  });

  test('aux expression is replaced with BinOp (output = stock / delay_time)', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux delayed = DELAY1(population, 3)
    `);
    const { ir: desugared } = desugarIR(ir);
    const delayedAux = desugared.auxiliaries.find(a => a.id === 'delayed')!;
    expect(delayedAux.expr.type).toBe('BinaryOperation'); // output = stock / delay_time
  });
});

describe('desugarIR — DELAY3 adds 3 hidden stocks', () => {
  test('three chained stages', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock s { init: 10 }
aux d = DELAY3(s, 3)
    `);
    const { ir: desugared } = desugarIR(ir);
    const hiddenStocks = desugared.stocks.filter(s => s.id.startsWith('_delay1'));
    expect(hiddenStocks).toHaveLength(3);
  });
});

describe('desugarIR — DELAYN diagnostics', () => {
  test('DELAYN with n < 1 emits INVALID_DELAY_ORDER', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock s { init: 10 }
aux d = DELAYN(s, 3, 0)
    `);
    const { diagnostics } = desugarIR(ir);
    expect(diagnostics.some(d => d.code === 'INVALID_DELAY_ORDER')).toBe(true);
  });
});

describe('desugarIR — SMTH1 structural changes', () => {
  test('adds one hidden stock per SMTH1', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock s { init: 100 }
aux smoothed = SMTH1(s, 4)
    `);
    const { ir: desugared, diagnostics } = desugarIR(ir);
    expect(diagnostics).toHaveLength(0);
    const hiddenStocks = desugared.stocks.filter(st => st.id.startsWith('_smth1'));
    expect(hiddenStocks).toHaveLength(1);
  });

  test('SMTH1 output is a Ref to the hidden stock', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 10 step: 1 }
stock s { init: 100 }
aux smoothed = SMTH1(s, 4)
    `);
    const { ir: desugared } = desugarIR(ir);
    const smoothedAux = desugared.auxiliaries.find(a => a.id === 'smoothed')!;
    expect(smoothedAux.expr.type).toBe('Reference');
  });
});

describe('desugarIR — non-stateful models pass through unchanged', () => {
  test('model with no delay/smooth is returned unmodified structurally', () => {
    const ir = buildIR(`
sfd m
time { start: 0 end: 5 step: 1 }
stock pop { init: 100 }
aux growthRate = 0.02
flow births { from: null to: pop rate: pop * growthRate }
    `);
    const { ir: desugared, diagnostics } = desugarIR(ir);
    expect(diagnostics).toHaveLength(0);
    expect(desugared.stocks).toHaveLength(ir.stocks.length);
    expect(desugared.flows).toHaveLength(ir.flows.length);
  });
});
