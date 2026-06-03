import type { IR } from "../model/index.js";
import type { SimDiagnostic } from "../diagnostics/index.js";

export interface SimRow {
	time: number;
	[id: string]: number;
}
export interface SimulationResult {
	rows: SimRow[];
	diagnostics: SimDiagnostic[];
}
export interface Simulator {
	simulate(ir: IR): SimulationResult;
}
