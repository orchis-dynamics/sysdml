import { describe, expect, it } from "vitest";

import { BUILTIN_FUNCTIONS } from "@sysdml/contracts/expression";
import { DiagnosticCode, SimDiagnosticCode } from "@sysdml/contracts/diagnostics";
import {
	BUILTIN_FUNCTIONS as RootBuiltins,
	DiagnosticCode as RootDiagnosticCode,
	SimDiagnosticCode as RootSimDiagnosticCode,
} from "@sysdml/contracts";
import type { IR } from "@sysdml/contracts/model";
import type { SimulationResult } from "@sysdml/contracts/simulation";
import type { ExtensionToWebviewMessage } from "@sysdml/contracts/protocol";
import type { FileNode, ParseResult } from "@sysdml/contracts/syntax";

describe("@sysdml/contracts barrels", () => {
	it("re-exports runtime value contracts from subpaths and root", () => {
		expect(DiagnosticCode.MISSING_STOCK).toBe("MISSING_STOCK");
		expect(SimDiagnosticCode.CYCLE_IN_AUX).toBe("CYCLE_IN_AUX");
		expect(BUILTIN_FUNCTIONS.has("ABS")).toBe(true);
		expect(RootDiagnosticCode.MISSING_STOCK).toBe("MISSING_STOCK");
		expect(RootSimDiagnosticCode.CYCLE_IN_AUX).toBe("CYCLE_IN_AUX");
		expect(RootBuiltins.has("ABS")).toBe(true);
	});

	it("exposes type-only contracts for every domain (compile-time)", () => {
		const ir: IR | null = null;
		const result: SimulationResult | null = null;
		const message: ExtensionToWebviewMessage | null = null;
		const ast: FileNode | null = null;
		const parse: ParseResult | null = null;
		expect([ir, result, message, ast, parse].every((value) => value === null)).toBe(true);
	});
});
