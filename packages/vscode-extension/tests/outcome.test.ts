import { runPipeline } from "@sysdml/cli/pipeline";
import { describe, expect, test } from "vitest";

import { outcomeFromPipeline } from "../src/simulate/outcome";

const CLEAN_MODEL = `
sfd growth
time { start: 0 end: 3 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const TWO_UNDEFINED_MODEL = `
sfd broken
time { start: 0 end: 3 step: 1 }
stock population { init: ghost_one }
aux a = ghost_two
`.trim();

const CLD_MODEL = `
cld loops
population ->+ births
births ->+ population
`.trim();

const SNAPPED_SAVE_STEP_MODEL = `
sfd snapped
time { start: 0 end: 10 step: 0.4 save_step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

const STOCHASTIC_MODEL = `
sfd unsupported
time { start: 0 end: 2 step: 1 }
stock x { init: 0 }
flow inflow { from: null to: x rate: RANDOM(0, 1) }
`.trim();

describe("outcomeFromPipeline", () => {
	test("clean sfd model yields csv with header and no warnings", async () => {
		const outcome = outcomeFromPipeline(await runPipeline(CLEAN_MODEL));
		expect(outcome.kind).toBe("csv");
		if (outcome.kind !== "csv") return;
		expect(outcome.csv.startsWith("time,population")).toBe(true);
		expect(outcome.csv.split("\n").filter(Boolean)).toHaveLength(5);
		expect(outcome.warnings).toEqual([]);
	});

	test("parse error yields an error outcome", async () => {
		const outcome = outcomeFromPipeline(
			await runPipeline("sfd broken\nstock {"),
		);
		expect(outcome.kind).toBe("error");
		if (outcome.kind !== "error") return;
		expect(outcome.message.length).toBeGreaterThan(0);
	});

	test("two fatal compile diagnostics yield first message plus count", async () => {
		const outcome = outcomeFromPipeline(await runPipeline(TWO_UNDEFINED_MODEL));
		expect(outcome.kind).toBe("error");
		if (outcome.kind !== "error") return;
		expect(outcome.message).toContain("ghost_one");
		expect(outcome.message).toContain("(+1 more)");
	});

	test("cld model yields the structural-model error", async () => {
		const outcome = outcomeFromPipeline(await runPipeline(CLD_MODEL));
		expect(outcome.kind).toBe("error");
		if (outcome.kind !== "error") return;
		expect(outcome.message).toBe(
			"Cannot simulate a cld model: a causal loop diagram describes structure only. Use an sfd model.",
		);
	});

	test("warning-severity diagnostics still simulate and carry the warning", async () => {
		const outcome = outcomeFromPipeline(
			await runPipeline(SNAPPED_SAVE_STEP_MODEL),
		);
		expect(outcome.kind).toBe("csv");
		if (outcome.kind !== "csv") return;
		expect(outcome.warnings).toHaveLength(1);
		expect(outcome.warnings[0]).toContain("save_step");
	});

	test("engine-unsupported builtin yields the simulation diagnostic", async () => {
		const outcome = outcomeFromPipeline(await runPipeline(STOCHASTIC_MODEL));
		expect(outcome.kind).toBe("error");
		if (outcome.kind !== "error") return;
		expect(outcome.message).toContain("RANDOM");
	});
});
