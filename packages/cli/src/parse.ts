import {
	formatDiagnosticBlock,
	formatParserDiagnostic,
} from "./diagnostics.js";
import { runPipeline } from "./pipeline.js";
import type { CommandResult } from "./types.js";

export async function runParseCommand(source: string): Promise<CommandResult> {
	const { ast, parseDiagnostics } = await runPipeline(source);

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
