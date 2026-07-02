import type { IR } from "@sysdml/contracts";
import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { describe, expect, test } from "vitest";

import { collectUnsupportedBuiltinDiagnostics } from "../src/engine-support.js";

function buildIR(source: string): IR {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (parseDiagnostics.length > 0) throw new Error(parseDiagnostics[0].message);
	const { ir, diagnostics } = compileAST(ast!);
	if (diagnostics.length > 0) throw new Error(diagnostics[0].message);
	return ir!;
}

function modelWithProbe(equation: string): string {
	return `
sfd probe_model
time { start: 0 end: 3 step: 1 }
stock s { init: 0 }
aux input = TIME
aux probe = ${equation}
`.trim();
}

describe("collectUnsupportedBuiltinDiagnostics", () => {
	test("flags FORCST with a clear reason", () => {
		const diagnostics = collectUnsupportedBuiltinDiagnostics(
			buildIR(modelWithProbe("FORCST(input, 2, 1)")),
		);
		expect(diagnostics).toEqual([
			{
				code: "error",
				message: "FORCST is not supported by the simulation engine",
			},
		]);
	});

	test("flags stochastic functions as unsupported by the deterministic engine", () => {
		const diagnostics = collectUnsupportedBuiltinDiagnostics(
			buildIR(modelWithProbe("NORMAL(0, 1)")),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe("error");
		expect(diagnostics[0].message).toContain("NORMAL");
		expect(diagnostics[0].message).toContain("stochastic");
	});

	test("does not flag builtins the engine supports", () => {
		const diagnostics = collectUnsupportedBuiltinDiagnostics(
			buildIR(modelWithProbe("SMTH1(input, 2) + DELAY1(input, 1)")),
		);
		expect(diagnostics).toEqual([]);
	});

	test("reports each unsupported builtin once, in a stable order", () => {
		const diagnostics = collectUnsupportedBuiltinDiagnostics(
			buildIR(
				modelWithProbe("FORCST(input, 2, 1) + NORMAL(0, 1) + NORMAL(1, 2)"),
			),
		);
		expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
			"FORCST is not supported by the simulation engine",
			"NORMAL is a stochastic function, which the deterministic simulation engine does not support",
		]);
	});
});
