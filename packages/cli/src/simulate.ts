import type { IRDiagnostic, SimDiagnostic } from "@sysdml/contracts";

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

export function isErrorSimDiagnostic(diagnostic: SimDiagnostic): boolean {
	if (diagnostic.severity !== undefined) {
		return diagnostic.severity === "error";
	}
	return diagnostic.code === "error";
}

function formatSimDiagnostic(diagnostic: SimDiagnostic): string {
	return `[${diagnostic.severity ?? diagnostic.code}] ${diagnostic.message}`;
}

function cldRejection(
	modelId: string,
	compileDiagnostics: IRDiagnostic[],
): CommandResult {
	const compileBlock =
		compileDiagnostics.length > 0
			? formatDiagnosticBlock(compileDiagnostics.map(formatIRDiagnostic))
			: "";
	const message = `Cannot simulate '${modelId}': causal loop diagrams (cld) have no stocks or flows to integrate. Declare the model as 'sfd' to simulate it.\n`;
	return { stdout: "", stderr: compileBlock + message, exitCode: 1 };
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

	if (ir.model.kind === "cld") {
		return cldRejection(ir.model.id, compileDiagnostics);
	}

	if (simulation === null) {
		throw new Error(
			"unreachable: simulation is null for a simulatable sfd model",
		);
	}

	const stdout =
		options.format === "csv"
			? formatCsv(ir, simulation)
			: JSON.stringify(simulation, null, 2) + "\n";

	const hasErrors = simulation.diagnostics.some(isErrorSimDiagnostic);

	const diagnosticLines = [
		...compileDiagnostics.map(formatIRDiagnostic),
		...simulation.diagnostics.map(formatSimDiagnostic),
	];

	const stderr =
		diagnosticLines.length > 0 ? formatDiagnosticBlock(diagnosticLines) : "";

	return { stdout: hasErrors ? "" : stdout, stderr, exitCode: hasErrors ? 1 : 0 };
}
