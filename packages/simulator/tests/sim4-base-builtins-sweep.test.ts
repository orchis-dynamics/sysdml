import { describe, test, it, expect } from "vitest";

import { evalAux, runExpr } from "./helpers.js";

// SIM4.3 — every base-required builtin from XMILE §3.5 evaluates end-to-end
// (parse → IR → EulerSimulator). Skipped entries are deferred to v0.2 per
// `stdlib.md` §4 and the `SIM - v0.2` kanban lane (card [SIM4.4 → v0.2]).

describe("§3.5.1 Math (16 functions) — all ✅", () => {
	test("ABS(-5) → 5", () => expect(evalAux("ABS(-5)")).toBe(5));
	test("ARCCOS(1) → 0", () => expect(evalAux("ARCCOS(1)")).toBeCloseTo(0));
	test("ARCSIN(0) → 0", () => expect(evalAux("ARCSIN(0)")).toBe(0));
	test("ARCTAN(0) → 0", () => expect(evalAux("ARCTAN(0)")).toBe(0));
	test("COS(0) → 1", () => expect(evalAux("COS(0)")).toBe(1));
	test("EXP(0) → 1", () => expect(evalAux("EXP(0)")).toBe(1));
	test("INF (no parens)", () => expect(evalAux("INF")).toBe(Infinity));
	test("INT(3.9) → 3", () => expect(evalAux("INT(3.9)")).toBe(3));
	test("LN(1) → 0", () => expect(evalAux("LN(1)")).toBe(0));
	test("LOG10(100) → 2", () => expect(evalAux("LOG10(100)")).toBeCloseTo(2));
	test("MAX(3, 5) → 5", () => expect(evalAux("MAX(3, 5)")).toBe(5));
	test("MIN(3, 5) → 3", () => expect(evalAux("MIN(3, 5)")).toBe(3));
	test("PI ≈ 3.14159", () => expect(evalAux("PI")).toBeCloseTo(Math.PI));
	test("SIN(0) → 0", () => expect(evalAux("SIN(0)")).toBe(0));
	test("SQRT(9) → 3", () => expect(evalAux("SQRT(9)")).toBe(3));
	test("TAN(0) → 0", () => expect(evalAux("TAN(0)")).toBe(0));
});

describe("§3.5.5 Time accessors (4 functions) — all ✅", () => {
	// Default helpers use `time { start: 0 end: 0 step: 1 }`, so TIME=0, DT=1,
	// STARTTIME=0, STOPTIME=0. Each builtin is callable with or without parens.
	test("TIME at t=0 returns 0", () => expect(evalAux("TIME")).toBe(0));
	test("DT returns the time-block step (default 1)", () => expect(evalAux("DT")).toBe(1));
	test("STARTTIME returns the time-block start", () => expect(evalAux("STARTTIME")).toBe(0));
	test("STOPTIME returns the time-block end", () => expect(evalAux("STOPTIME")).toBe(0));
});

describe("§3.5.4 Test input (3 functions) — all ✅", () => {
	// PULSE(magnitude, first_pulse): emits magnitude/DT during one DT at first_pulse, 0 otherwise.
	test("PULSE(10, 0) at t=0 returns 10/DT = 10", () => {
		expect(evalAux("PULSE(10, 0)")).toBe(10);
	});

	// RAMP(slope, start_time): 0 before start_time, slope*(t - start_time) after.
	test("RAMP(2, 0) at t=3 returns 6", () => {
		const rows = runExpr("RAMP(2, 0)", 4, 1);
		expect(rows[3].result).toBeCloseTo(6);
	});

	// STEP(magnitude, start_time): 0 before start_time, magnitude at-and-after.
	test("STEP(5, 2) at t=0 returns 0, at t=3 returns 5", () => {
		const rows = runExpr("STEP(5, 2)", 4, 1);
		expect(rows[0].result).toBe(0);
		expect(rows[3].result).toBe(5);
	});
});

describe("§3.5.3 Delay / smoothing (8 of 9 ✅; DELAY ⬜ v0.2)", () => {
	// At t=0 each delay/smooth returns its initial value. Helpers default to a
	// single-step model so we only check the t=0 row.
	test("DELAY1(0, 5, 42) at t=0 returns init=42", () => {
		expect(evalAux("DELAY1(0, 5, 42)")).toBe(42);
	});
	test("DELAY3(0, 5, 42) at t=0 returns init=42", () => {
		expect(evalAux("DELAY3(0, 5, 42)")).toBe(42);
	});
	test("DELAYN(0, 5, 3, 42) at t=0 returns init=42", () => {
		expect(evalAux("DELAYN(0, 5, 3, 42)")).toBe(42);
	});
	test("SMTH1(0, 5, 42) at t=0 returns init=42", () => {
		expect(evalAux("SMTH1(0, 5, 42)")).toBe(42);
	});
	test("SMTH3(0, 5, 42) at t=0 returns init=42", () => {
		expect(evalAux("SMTH3(0, 5, 42)")).toBe(42);
	});
	test("SMTHN(0, 5, 3, 42) at t=0 returns init=42", () => {
		expect(evalAux("SMTHN(0, 5, 3, 42)")).toBe(42);
	});
	test("TREND(10, 5, 10) at t=0 returns 0 (input == smooth init)", () => {
		// TREND desugars to (input - smooth) / (avg_time * smooth). At t=0 the
		// smooth equals its init argument, so input=init=10 gives 0/50 = 0.
		// init_trend=0 with input=0 would yield 0/0 = NaN, so we seed init=10
		// (the underlying simulator divergence from stdlib.md §4.4 is tracked
		// by [SIM4.5 → v0.2]).
		expect(evalAux("TREND(10, 5, 10)")).toBe(0);
	});
	test("FORCST(10, 5, 10, 10) at t=0 returns input * (1 + 0*horizon) = 10", () => {
		// FORCST desugars to input * (1 + TREND * horizon). With TREND=0 at t=0
		// (same init trick as above), the result is just `input` = 10.
		expect(evalAux("FORCST(10, 5, 10, 10)")).toBe(10);
	});

	it.skip("DELAY (infinite-order / pipeline) — deferred to v0.2 per stdlib.md §4.4 and simlib.md D4", () => {
		// Ring buffer architecture; tracked by [SIM4.4 → v0.2].
	});
});

describe("§3.5.6 Misc — INIT ✅ / PREVIOUS ✅ / SELF ⬜", () => {
	test("INIT(s) returns stock's initial value", () => {
		// helpers.modelSrc seeds `stock s { init: 0 }`, so INIT(s) = 0.
		expect(evalAux("INIT(s)")).toBe(0);
	});

	test("PREVIOUS(s, 99) at t=0 returns the init argument", () => {
		expect(evalAux("PREVIOUS(s, 99)")).toBe(99);
	});

	it.skip("SELF — deferred per stdlib.md §4.3; simulator case missing (tracked by [SIM4.4 → v0.2])", () => {
		// Only valid as the argument to PREVIOUS or SIZE; IR arity exists but
		// the simulator currently has no case for SELF.
	});
});

describe("§3.5.2 Statistical (5 functions) — all ⬜ simulator, deferred to v0.2", () => {
	it.skip("EXPRND — deferred (stochastic features, [SIM4.4 → v0.2] + D2)", () => {});
	it.skip("LOGNORMAL — deferred (stochastic features, [SIM4.4 → v0.2] + D2)", () => {});
	it.skip("NORMAL — deferred (stochastic features, [SIM4.4 → v0.2] + D2)", () => {});
	it.skip("POISSON — deferred (stochastic features, [SIM4.4 → v0.2] + D2)", () => {});
	it.skip("RANDOM — deferred (stochastic features, [SIM4.4 → v0.2] + D2)", () => {});
});
