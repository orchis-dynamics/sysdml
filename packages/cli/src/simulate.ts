import type { IRDiagnostic } from "@sysdml/ir";
import type { Diagnostic as ParseDiagnostic } from "@sysdml/parser";

import { formatCsv } from "./csv.js";
import type { CommandResult } from "./parse.js";
import { runPipeline } from "./pipeline.js";

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
			stderr: formatDiagnostics(parseDiagnostics.map(formatParseDiagnostic)),
			exitCode: 1,
		};
	}

	if (ir === null) {
		return {
			stdout: "",
			stderr: formatDiagnostics(
				compileDiagnostics.map(formatCompileDiagnostic),
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
			? formatDiagnostics(
					simulation.diagnostics.map(
						(diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`,
					),
				)
			: "";

	return { stdout, stderr, exitCode: 0 };
}

function formatDiagnostics(lines: string[]): string {
	return (
		["--- Diagnostics ---", ...lines.map((line) => `  ${line}`)].join("\n") +
		"\n"
	);
}

function formatParseDiagnostic(diagnostic: ParseDiagnostic): string {
	return `[${diagnostic.span.start.line}:${diagnostic.span.start.col}] ${diagnostic.message}`;
}

function formatCompileDiagnostic(diagnostic: IRDiagnostic): string {
	const location = diagnostic.span
		? `[${diagnostic.span.start.line}:${diagnostic.span.start.col}] `
		: "";
	return `${location}[${diagnostic.code}] ${diagnostic.message}`;
}
