import { describe, test, expect } from 'vitest';
import { parseSource } from '@sysdml/parser';
import { compileAST } from '@sysdml/ir';
import { EulerSimulator } from '../src/index.js';
import { SimDiagnosticCode } from '../src/types.js';

const simulator = new EulerSimulator();

function simulate(modelSrc: string) {
	const { ast, diagnostics: parseDiag } = parseSource(modelSrc);
	if (parseDiag.length > 0) throw new Error(`Parse: ${parseDiag[0].message}`);
	const { ir, diagnostics: irDiag } = compileAST(ast!);
	if (irDiag.length > 0) throw new Error(`IR: ${irDiag[0].message}`);
	return simulator.simulate(ir!);
}

describe('math domain errors halt the simulation cleanly', () => {
	test('LN(0) emits MATH_DOMAIN_ERROR and halts at t = start', () => {
		const result = simulate(`
model m
time { start: 0 end: 5 step: 1 }
stock s { init: 0 }
aux result = LN(0)
`);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].code).toBe(SimDiagnosticCode.MATH_DOMAIN_ERROR);
		expect(result.diagnostics[0].message).toContain('LN(0)');
		expect(result.rows).toEqual([]);
	});

	test('LN of a stock that hits zero mid-run halts mid-simulation, returns rows so far', () => {
		const result = simulate(`
model m
time { start: 0 end: 5 step: 1 }
stock s { init: 3 }
flow drain {
  from: s
  to: null
  rate: 1
}
aux result = LN(s)
`);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].code).toBe(SimDiagnosticCode.MATH_DOMAIN_ERROR);
		expect(result.rows.length).toBeGreaterThan(0);
		expect(result.rows.length).toBeLessThan(6);
	});

	test('SQRT(-1) halts, but SQRT(0) does not', () => {
		const bad = simulate(`
model m
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux result = SQRT(0 - 1)
`);
		expect(bad.diagnostics[0]?.code).toBe(SimDiagnosticCode.MATH_DOMAIN_ERROR);

		const ok = simulate(`
model m
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux result = SQRT(0)
`);
		expect(ok.diagnostics).toHaveLength(0);
		expect(ok.rows[0].result).toBe(0);
	});

	test('LOG10(0) halts', () => {
		const result = simulate(`
model m
time { start: 0 end: 1 step: 1 }
stock s { init: 0 }
aux result = LOG10(0)
`);
		expect(result.diagnostics[0]?.code).toBe(SimDiagnosticCode.MATH_DOMAIN_ERROR);
	});
});
