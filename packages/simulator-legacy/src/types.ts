import type { IR, IRGraphicalFunction } from "@sysdml/contracts";

export type Env = Record<string, number>;

export interface SimContext {
	t: number;
	start: number;
	end: number;
	step: number;
}

export interface EvalContext {
	env: Env;
	sim: SimContext;
	initEnv: Env;
	prevEnv: Env;
	gfRegistry: ReadonlyMap<string, IRGraphicalFunction>;
}

export interface SimRow {
	time: number;
	[id: string]: number;
}

export const SimDiagnosticCode = {
	CYCLE_IN_AUX: "CYCLE_IN_AUX",
	INIT_REQUIRES_IDENT: "INIT_REQUIRES_IDENT",
	INVALID_DELAY_ORDER: "INVALID_DELAY_ORDER",
	WARN_PULSE_INTERVAL: "WARN_PULSE_INTERVAL",
	FUNCTION_NOT_IN_V1: "FUNCTION_NOT_IN_V1",
	MATH_DOMAIN_ERROR: "MATH_DOMAIN_ERROR",
} as const;

export type SimDiagnosticCode =
	(typeof SimDiagnosticCode)[keyof typeof SimDiagnosticCode];

export interface SimDiagnostic {
	code: SimDiagnosticCode;
	message: string;
}

export interface SimulationResult {
	rows: SimRow[];
	diagnostics: SimDiagnostic[];
}

export interface Simulator {
	simulate(ir: IR): SimulationResult;
}

export class SimulationHaltedError extends Error {
	constructor(public readonly diagnostic: SimDiagnostic) {
		super(diagnostic.message);
		this.name = "SimulationHaltedError";
	}
}
