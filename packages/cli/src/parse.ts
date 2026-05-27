import { runPipeline } from "./pipeline.js";

export interface CommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export function runParseCommand(source: string): CommandResult {
	const { ast, parseDiagnostics } = runPipeline(source);

	if (ast === null) {
		const lines = parseDiagnostics.map(
			(diagnostic) =>
				`  [${diagnostic.span.start.line}:${diagnostic.span.start.col}] ${diagnostic.message}`,
		);
		return {
			stdout: "",
			stderr: ["--- Diagnostics ---", ...lines].join("\n") + "\n",
			exitCode: 1,
		};
	}

	return {
		stdout: JSON.stringify(ast, null, 2) + "\n",
		stderr: "",
		exitCode: 0,
	};
}
