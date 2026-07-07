import { formatCsv } from "@sysdml/cli/csv";
import type { PipelineResult } from "@sysdml/cli/pipeline";

export type SimulateOutcome =
	| { kind: "csv"; csv: string; warnings: string[] }
	| { kind: "error"; message: string };

function firstWithCount(messages: string[]): string {
	const extra = messages.length - 1;
	return extra > 0 ? `${messages[0]} (+${extra} more)` : messages[0];
}

export function outcomeFromPipeline(result: PipelineResult): SimulateOutcome {
	if (result.parseDiagnostics.length > 0) {
		return {
			kind: "error",
			message: firstWithCount(result.parseDiagnostics.map((d) => d.message)),
		};
	}
	const fatal = result.compileDiagnostics.filter(
		(d) => d.severity !== "warning",
	);
	if (result.ir === null || fatal.length > 0) {
		return {
			kind: "error",
			message:
				fatal.length > 0
					? firstWithCount(fatal.map((d) => d.message))
					: "Compilation produced no IR.",
		};
	}
	if (result.ir.model.kind === "cld") {
		return {
			kind: "error",
			message:
				"Cannot simulate a cld model: a causal loop diagram describes structure only. Use an sfd model.",
		};
	}
	const simulationError = result.simulation?.diagnostics.find(
		(d) => d.code === "error",
	);
	if (simulationError !== undefined) {
		return { kind: "error", message: simulationError.message };
	}
	if (result.simulation === null) {
		return { kind: "error", message: "Simulation produced no result." };
	}
	return {
		kind: "csv",
		csv: formatCsv(result.ir, result.simulation),
		warnings: result.compileDiagnostics
			.filter((d) => d.severity === "warning")
			.map((d) => d.message),
	};
}
