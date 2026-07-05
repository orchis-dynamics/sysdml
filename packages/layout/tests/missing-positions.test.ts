import { describe, expect, test } from "vitest";

import { computeMissingPositions } from "../src/missing-positions.js";
import { aux, connection, ir, stock, flow } from "./helpers/ir-builders.js";

describe("computeMissingPositions", () => {
	test("cld: bare connection endpoints and unpositioned auxes are missing", () => {
		const model = ir({
			model: { id: "m", kind: "cld" },
			auxiliaries: [aux("a", { x: 10, y: 20 }), aux("b")],
			connections: [connection("a", "c", "+")],
		});
		const missing = computeMissingPositions(model);
		expect(missing.map((m) => m.id).sort()).toEqual(["b", "c"]);
	});

	test("cld: fully positioned model has nothing missing", () => {
		const model = ir({
			model: { id: "m", kind: "cld" },
			auxiliaries: [aux("a", { x: 10, y: 20 }), aux("b", { x: 30, y: 40 })],
			connections: [connection("a", "b", "+")],
		});
		expect(computeMissingPositions(model)).toEqual([]);
	});

	test("sfd: stocks and auxes are missing, flows are excluded", () => {
		const model = ir({
			model: { id: "m", kind: "sfd" },
			stocks: [stock("s")],
			auxiliaries: [aux("rate_aux")],
			flows: [flow("f", "s", null)],
		});
		const ids = computeMissingPositions(model).map((m) => m.id);
		expect(ids).toContain("s");
		expect(ids).toContain("rate_aux");
		expect(ids).not.toContain("f");
	});

	test("coordinates are integers and deterministic across calls", () => {
		const model = ir({
			model: { id: "m", kind: "cld" },
			connections: [connection("a", "b", "+"), connection("b", "c", "-")],
		});
		const first = computeMissingPositions(model);
		const second = computeMissingPositions(model);
		expect(second).toEqual(first);
		for (const entry of first) {
			expect(Number.isInteger(entry.position.x)).toBe(true);
			expect(Number.isInteger(entry.position.y)).toBe(true);
		}
	});
});
