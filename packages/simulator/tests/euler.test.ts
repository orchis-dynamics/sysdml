import { describe, test, expect } from 'vitest';
import { buildIR, evalAux, runExpr, runModel } from './helpers.js';

// ── Basic eval ──────────────────────────────────────────────────────────────

describe('basic expression evaluation via EulerSimulator', () => {
  test('numeric literal', () => expect(evalAux('42')).toBe(42));
  test('arithmetic: 2 + 3 * 4', () => expect(evalAux('2 + 3 * 4')).toBe(14));
  test('IF 1 THEN 10 ELSE 20', () => expect(evalAux('IF 1 THEN 10 ELSE 20')).toBe(10));
  test('ABS(-7)', () => expect(evalAux('ABS(-7)')).toBe(7));
  test('SQRT(9)', () => expect(evalAux('SQRT(9)')).toBe(3));
  test('PI > 3', () => expect(evalAux('PI > 3')).toBe(1));
  test('SIGN(-5)', () => expect(evalAux('SIGN(-5)')).toBe(-1));
  test('SAFEDIV(10, 0, 99)', () => expect(evalAux('SAFEDIV(10, 0, 99)')).toBe(99));
  test('INT(-1.5) → -2', () => expect(evalAux('INT(-1.5)')).toBe(-2));
});

// ── Stock-flow: exponential growth ──────────────────────────────────────────

describe('exponential growth: P(t) = P0 * e^(r*t)', () => {
  function growthModel(start: number, end: number, step: number): string {
    return `
model m
time { start: ${start} end: ${end} step: ${step} }
stock population { init: 100 }
aux birth_rate = 0.1
flow births { from: null to: population rate: population * birth_rate }
    `.trim();
  }

  test('population at t=0 is 100', () => {
    const rows = runModel(growthModel(0, 10, 1));
    expect(rows[0].population).toBe(100);
  });

  test('population increases each step', () => {
    const rows = runModel(growthModel(0, 5, 1));
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].population).toBeGreaterThan(rows[i - 1].population);
    }
  });

  test('Euler approximation at t=10 is within 5% of analytical solution', () => {
    const rows = runModel(growthModel(0, 10, 0.1));
    const final = rows[rows.length - 1].population;
    const analytical = 100 * Math.exp(0.1 * 10);
    expect(Math.abs(final - analytical) / analytical).toBeLessThan(0.05);
  });
});

// ── Stock-flow: decay ───────────────────────────────────────────────────────

describe('exponential decay: convergence to analytical solution as dt shrinks', () => {
  function decayModel(step: number): string {
    return `
model m
time { start: 0 end: 5 step: ${step} }
stock x { init: 100 }
aux decay_rate = 0.5
flow drain { from: x to: null rate: x * decay_rate }
    `.trim();
  }

  test('dt=0.01 within 1% of analytical', () => {
    const rows = runModel(decayModel(0.01));
    const final = rows[rows.length - 1].x;
    const analytical = 100 * Math.exp(-0.5 * 5);
    expect(Math.abs(final - analytical) / analytical).toBeLessThan(0.01);
  });
});

// ── Topological sort correctness ────────────────────────────────────────────

describe('aux evaluation order is topologically correct', () => {
  test('b = 2*a, c = a+b in wrong declaration order produces correct c', () => {
    const rows = runModel(`
model m
time { start: 0 end: 0 step: 1 }
stock s { init: 0 }
aux c = a + b
aux b = 2 * a
aux a = 5
    `.trim());
    expect(rows[0].a).toBe(5);
    expect(rows[0].b).toBe(10);
    expect(rows[0].c).toBe(15);
  });
});

// ── Simulation time functions ───────────────────────────────────────────────

describe('TIME and DT in expressions', () => {
  test('TIME returns current t at each step', () => {
    const rows = runModel(`
model m
time { start: 0 end: 3 step: 1 }
stock s { init: 0 }
aux current_time = TIME
    `.trim());
    expect(rows[0].current_time).toBe(0);
    expect(rows[1].current_time).toBe(1);
    expect(rows[2].current_time).toBe(2);
    expect(rows[3].current_time).toBe(3);
  });

  test('STARTTIME and STOPTIME return model bounds', () => {
    const rows = runModel(`
model m
time { start: 2 end: 8 step: 1 }
stock s { init: 0 }
aux t_start = STARTTIME
aux t_stop  = STOPTIME
    `.trim());
    expect(rows[0].t_start).toBe(2);
    expect(rows[0].t_stop).toBe(8);
  });
});

// ── Test signals ────────────────────────────────────────────────────────────

describe('STEP function', () => {
  test('0 before start_time, height at and after', () => {
    const rows = runModel(`
model m
time { start: 0 end: 5 step: 1 }
stock s { init: 0 }
aux signal = STEP(10, 3)
    `.trim());
    expect(rows[0].signal).toBe(0);
    expect(rows[2].signal).toBe(0);
    expect(rows[3].signal).toBe(10);
    expect(rows[5].signal).toBe(10);
  });
});

describe('RAMP function', () => {
  test('0 before start_time, slope*elapsed after', () => {
    const rows = runModel(`
model m
time { start: 0 end: 5 step: 1 }
stock s { init: 0 }
aux signal = RAMP(2, 2)
    `.trim());
    expect(rows[0].signal).toBe(0);
    expect(rows[1].signal).toBe(0);
    expect(rows[2].signal).toBeCloseTo(0);
    expect(rows[3].signal).toBeCloseTo(2);
    expect(rows[4].signal).toBeCloseTo(4);
  });
});

// ── Graphical functions ─────────────────────────────────────────────────────

describe('graphical function evaluation via EulerSimulator', () => {
  test('named GF: linear interpolation evaluated correctly', () => {
    const rows = runModel(`
model m
time { start: 0 end: 0 step: 1 }
stock s { init: 0 }
gf effect { xscale: [0, 10] ypts: [0, 5, 10] }
aux x = 5
aux result = effect(x)
    `.trim());
    expect(rows[0].result).toBeCloseTo(5);
  });

  test('lookup() inline graphical function', () => {
    const rows = runModel(`
model m
time { start: 0 end: 0 step: 1 }
stock s { init: 0 }
aux x = 0.5
aux result = lookup(x, 0, 10, 20)
    `.trim());
    // lookup(x, y0, y1, y2) with implicit xscale [0,1], x=0.5
    // 3 ypts → x at 0, 0.5, 1.0. x=0.5 → y=10
    expect(rows[0].result).toBeCloseTo(10);
  });
});

// ── INIT and PREVIOUS ───────────────────────────────────────────────────────

describe('INIT function', () => {
  test('INIT(population) returns value at STARTTIME regardless of current t', () => {
    const rows = runModel(`
model m
time { start: 0 end: 3 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.1
flow births { from: null to: population rate: population * birth_rate }
aux initial_pop = INIT(population)
    `.trim());
    expect(rows[0].initial_pop).toBe(100);
    expect(rows[1].initial_pop).toBe(100);
    expect(rows[3].initial_pop).toBe(100);
  });
});

describe('PREVIOUS function', () => {
  test('PREVIOUS returns init value at t=STARTTIME', () => {
    const rows = runModel(`
model m
time { start: 0 end: 3 step: 1 }
stock s { init: 0 }
aux x = TIME
aux prev_x = PREVIOUS(x, 999)
    `.trim());
    expect(rows[0].prev_x).toBe(999);
  });

  test('PREVIOUS returns value from prior step', () => {
    const rows = runModel(`
model m
time { start: 0 end: 3 step: 1 }
stock s { init: 0 }
aux x = TIME
aux prev_x = PREVIOUS(x, 999)
    `.trim());
    expect(rows[1].prev_x).toBe(0);
    expect(rows[2].prev_x).toBe(1);
    expect(rows[3].prev_x).toBe(2);
  });
});

// ── DELAY1 end-to-end ───────────────────────────────────────────────────────

describe('DELAY1 simulation output', () => {
  test('DELAY1 output converges to input after delay_time passes', () => {
    const rows = runModel(`
model m
time { start: 0 end: 20 step: 0.1 }
stock s { init: 0 }
aux input_val = 5
aux delayed = DELAY1(input_val, 2)
    `.trim());
    const last = rows[rows.length - 1];
    expect(last.delayed).toBeCloseTo(5, 1);
  });
});

// ── SMTH1 end-to-end ────────────────────────────────────────────────────────

describe('SMTH1 simulation output', () => {
  test('SMTH1 output approaches step input exponentially', () => {
    const rows = runModel(`
model m
time { start: 0 end: 50 step: 0.1 }
stock s { init: 0 }
aux input_val = 10
aux smoothed = SMTH1(input_val, 5)
    `.trim());
    const last = rows[rows.length - 1];
    expect(last.smoothed).toBeCloseTo(10, 1);
  });
});

// ── IEEE 754 propagation (D1) ───────────────────────────────────────────────

describe('IEEE 754 propagation (D1): domain violations do not throw', () => {
  test('1/0 → Infinity does not abort simulation', () => {
    expect(() => evalAux('1 / 0')).not.toThrow();
    expect(evalAux('1 / 0')).toBe(Infinity);
  });

  test('LN(0) → -Infinity', () => expect(evalAux('LN(0)')).toBe(-Infinity));
  test('SQRT(-1) → NaN',     () => expect(evalAux('SQRT(-1)')).toBeNaN());
});

// ── Deferred v0.2 functions ─────────────────────────────────────────────────

describe('deferred v0.2 functions throw with clear message', () => {
  test('RANDOM throws mentioning v0.2', () => {
    expect(() => evalAux('RANDOM(0, 1)')).toThrow('v0.2');
  });
});

// ── runExpr helper sanity check ──────────────────────────────────────────────

describe('runExpr helper', () => {
  test('returns correct number of rows', () => {
    const rows = runExpr('TIME', 3, 1);
    // steps 0..3 → 4 rows
    expect(rows).toHaveLength(4);
  });

  test('buildIR is exported and functional', () => {
    const ir = buildIR(`
model m
time { start: 0 end: 0 step: 1 }
stock s { init: 42 }
    `.trim());
    expect(ir.stocks[0].id).toBe('s');
  });
});
