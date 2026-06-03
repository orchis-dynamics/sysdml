import type { IRGraphicalFunction } from "@sysdml/contracts";
import type { SimDiagnostic } from "@sysdml/contracts";

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

export class SimulationHaltedError extends Error {
	constructor(public readonly diagnostic: SimDiagnostic) {
		super(diagnostic.message);
		this.name = "SimulationHaltedError";
	}
}
