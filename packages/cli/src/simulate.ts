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

export async function runSimulateCommand(
	source: string,
	options: SimulateOptions,
): Promise<CommandResult> {
	const { ast, parseDiagnostics, ir, compileDiagnostics, simulation } =
		await runPipeline(source);

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
			stderr: formatDiagnosticBlock(compileDiagnostics.map(formatIRDiagnostic)),
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

	const hasErrors = simulation.diagnostics.some(
		(diagnostic) => diagnostic.code === "error",
	);

	const stderr =
		simulation.diagnostics.length > 0
			? formatDiagnosticBlock(
					simulation.diagnostics.map(
						(diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`,
					),
				)
			: "";

	return { stdout: hasErrors ? "" : stdout, stderr, exitCode: hasErrors ? 1 : 0 };
}
