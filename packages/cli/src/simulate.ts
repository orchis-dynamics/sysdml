import { formatCsv } from "./csv.js";
import {
	formatDiagnosticBlock,
	formatParserDiagnostic,
	formatIRDiagnostic,
} from "./diagnostics.js";
import { runPipeline } from "./pipeline.js";
import type { CommandResult } from "./types.js";

export interface SimulateOptions {
	format: "json" | "csv";
}

export function runSimulateCommand(
	source: string,
	options: SimulateOptions,
): CommandResult {
	const { ast, parseDiagnostics, ir, compileDiagnostics, simulation } =
		runPipeline(source);

	if (ast === null) {
		return {
			stdout: "",
			stderr: formatDiagnosticBlock(
				parseDiagnostics.map(formatParserDiagnostic),
			),
			exitCode: 1,
		};
	}

	if (ir === null) {
		return {
			stdout: "",
			stderr: formatDiagnosticBlock(
				compileDiagnostics.map(formatIRDiagnostic),
			),
			exitCode: 1,
		};
	}

	if (simulation === null) {
		throw new Error("unreachable: simulation is null while ir is non-null");
	}

	const stdout =
		options.format === "csv"
			? formatCsv(ir, simulation)
			: JSON.stringify(simulation, null, 2) + "\n";

	const stderr =
		simulation.diagnostics.length > 0
			? formatDiagnosticBlock(
					simulation.diagnostics.map(
						(diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`,
					),
				)
			: "";

	return { stdout, stderr, exitCode: 0 };
}
