import { describe, test, expect } from "vitest";

import { runModel } from "./helpers.js";

// SIM1.2 — XMILE §3 model assumption #5: simulation is deterministic given
// the inputs. Two runs of the same source over the same time block MUST
// produce byte-identical row sequences. `AGENT_CONTEXT.md` §7.3 also lists
// this as a hard guardrail. Pinning it explicitly here so the next time the
// simulator gains a feature (e.g. RK4, stochastic functions in v0.2) we have
// a regression check that the deterministic subset stays stable.

const FIXTURE_MODEL = `
sfd determinism_pin
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.1
aux death_rate = 0.05
flow births { from: null to: population rate: population * birth_rate }
flow deaths { from: population to: null rate: population * death_rate }
`.trim();

describe("[SIM1.2] determinism — same input + same time block → identical rows across runs", () => {
	test("two runs produce deeply-equal SimRow sequences", () => {
		const rowsA = runModel(FIXTURE_MODEL);
		const rowsB = runModel(FIXTURE_MODEL);
		expect(rowsB).toEqual(rowsA);
	});

	test("three runs produce identical row counts and population trajectories", () => {
		const a = runModel(FIXTURE_MODEL);
		const b = runModel(FIXTURE_MODEL);
		const c = runModel(FIXTURE_MODEL);
		expect(b).toHaveLength(a.length);
		expect(c).toHaveLength(a.length);
		for (let i = 0; i < a.length; i++) {
			expect(b[i].population).toBe(a[i].population);
			expect(c[i].population).toBe(a[i].population);
		}
	});

	test("JSON-stringified rows are byte-identical across runs", () => {
		// CSV/JSON export determinism follows from row-level determinism, but
		// pin the serialised form too because that's what users see.
		const jsonA = JSON.stringify(runModel(FIXTURE_MODEL));
		const jsonB = JSON.stringify(runModel(FIXTURE_MODEL));
		expect(jsonB).toBe(jsonA);
	});
});
