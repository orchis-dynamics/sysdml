import { compileAST } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { EulerSimulator } from "@sysdml/simulator";
import type { IR, IRDiagnostic, Diagnostic as ParseDiagnostic, FileNode, SimulationResult } from "@sysdml/contracts";

export interface PipelineResult {
	ast: FileNode | null;
	parseDiagnostics: ParseDiagnostic[];
	ir: IR | null;
	compileDiagnostics: IRDiagnostic[];
	simulation: SimulationResult | null;
}

export function runPipeline(source: string): PipelineResult {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (ast === null) {
		return {
			ast: null,
			parseDiagnostics,
			ir: null,
			compileDiagnostics: [],
			simulation: null,
		};
	}

	const { ir, diagnostics: compileDiagnostics } = compileAST(ast);
	if (ir === null) {
		return {
			ast,
			parseDiagnostics,
			ir: null,
			compileDiagnostics,
			simulation: null,
		};
	}

	const simulation = new EulerSimulator().simulate(ir);
	return {
		ast,
		parseDiagnostics,
		ir,
		compileDiagnostics,
		simulation,
	};
}
