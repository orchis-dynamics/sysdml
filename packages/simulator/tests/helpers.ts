import { compileAST } from "@sysdml/ir";
import type { IR } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";

import { EulerSimulator } from "../src/euler.js";
import type { SimRow } from "../src/types.js";

export function buildIR(src: string): IR {
	const { ast, diagnostics: parseDiagnostics } = parseSource(src);
	if (parseDiagnostics.length > 0)
		throw new Error(`Parse: ${parseDiagnostics[0].message}`);
	const { ir, diagnostics: irDiagnostics } = compileAST(ast!);
	if (irDiagnostics.length > 0)
		throw new Error(`IR: ${irDiagnostics[0].message}`);
	return ir!;
}

export function modelSrc(
	body: string,
	time = "start: 0 end: 0 step: 1",
): string {
	return `sfd m\ntime { ${time} }\nstock s { init: 0 }\n${body}`.trim();
}

export function runModel(src: string): SimRow[] {
	const ir = buildIR(src);
	const { rows, diagnostics } = new EulerSimulator().simulate(ir);
	if (diagnostics.some((d) => d.code === "CYCLE_IN_AUX"))
		throw new Error("Cycle in aux");
	return rows;
}

/** Evaluate a single aux expression at t=0, returns first row's value. */
export function evalAux(exprSrc: string, extras = ""): number {
	const src = modelSrc(`${extras}\naux result = ${exprSrc}`);
	return runModel(src)[0].result;
}

/** Run a model for multiple steps, return all rows. */
export function runExpr(exprSrc: string, steps: number, step = 1): SimRow[] {
	const end = steps * step;
	const src = modelSrc(
		`aux result = ${exprSrc}`,
		`start: 0 end: ${end} step: ${step}`,
	);
	return runModel(src);
}
