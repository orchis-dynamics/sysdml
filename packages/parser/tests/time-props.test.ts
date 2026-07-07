import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type { DeclarationNode, TimeDeclarationNode } from "../src/index.js";

function isTimeDeclaration(n: DeclarationNode): n is TimeDeclarationNode {
	return n.type === "TimeDeclaration";
}

function parseTime(src: string) {
	const { ast, diagnostics } = parseSource(src);
	expect(diagnostics).toHaveLength(0);
	expect(ast).not.toBeNull();
	const time = ast!.decls.find(isTimeDeclaration);
	if (time === undefined) throw new Error("expected TimeDeclaration");
	return time;
}

describe("time block save_step and time_units", () => {
	test("save_step parses as a numeric time prop", () => {
		const time = parseTime(
			`sfd m\ntime { start: 0 end: 10 step: 0.25 save_step: 1 }\nstock s { init: 0 }`,
		);
		const saveStep = time.props.find((p) => p.key === "save_step");
		expect(saveStep).toBeDefined();
		expect(saveStep!.value.value).toBe("1");
		expect(saveStep!.span.start.line).toBe(2);
	});

	test("time_units parses into the dedicated timeUnits field", () => {
		const time = parseTime(
			`sfd m\ntime { start: 0 end: 10 step: 1 time_units: years }\nstock s { init: 0 }`,
		);
		expect(time.timeUnits).toBeDefined();
		expect(time.timeUnits!.value).toBe("years");
		expect(time.props.map((p) => p.key)).toEqual(["start", "end", "step"]);
	});

	test("both props together, any order", () => {
		const time = parseTime(
			`sfd m\ntime { time_units: hours start: 0 save_step: 2 end: 10 step: 1 }\nstock s { init: 0 }`,
		);
		expect(time.timeUnits!.value).toBe("hours");
		expect(time.props.find((p) => p.key === "save_step")!.value.value).toBe(
			"2",
		);
	});

	test("time block without the new props has no timeUnits field value", () => {
		const time = parseTime(
			`sfd m\ntime { start: 0 end: 10 step: 1 }\nstock s { init: 0 }`,
		);
		expect(time.timeUnits).toBeUndefined();
	});

	test("duplicate save_step produces a diagnostic on the second occurrence", () => {
		const { ast, diagnostics } = parseSource(
			`sfd m\ntime { start: 0 end: 10 step: 1 save_step: 1\n save_step: 2 }\nstock s { init: 0 }`,
		);
		expect(ast).toBeNull();
		const diag = diagnostics.find((d) =>
			d.message.includes("duplicate 'save_step'"),
		);
		expect(diag).toBeDefined();
		expect(diag!.span.start.line).toBe(3);
	});

	test("duplicate time_units produces a diagnostic on the second occurrence", () => {
		const { ast, diagnostics } = parseSource(
			`sfd m\ntime { start: 0 end: 10 step: 1 time_units: years\n time_units: days }\nstock s { init: 0 }`,
		);
		expect(ast).toBeNull();
		const diag = diagnostics.find((d) =>
			d.message.includes("duplicate 'time_units'"),
		);
		expect(diag).toBeDefined();
		expect(diag!.span.start.line).toBe(3);
	});
});
