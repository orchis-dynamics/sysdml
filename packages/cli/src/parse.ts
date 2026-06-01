import {
	formatDiagnosticBlock,
	formatParserDiagnostic,
} from "./diagnostics.js";
import { runPipeline } from "./pipeline.js";
import type { CommandResult } from "./types.js";

export function runParseCommand(source: string): CommandResult {
	const { ast, parseDiagnostics } = runPipeline(source);

	if (ast === null) {
		return {
			stdout: "",
			stderr: formatDiagnosticBlock(
				parseDiagnostics.map(formatParserDiagnostic),
			),
			exitCode: 1,
		};
	}

	return {
		stdout: JSON.stringify(ast, null, 2) + "\n",
		stderr: "",
		exitCode: 0,
	};
}
