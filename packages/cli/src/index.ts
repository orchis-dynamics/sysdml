#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { runParseCommand } from "./parse.js";
import { runSimulateCommand } from "./simulate.js";

const USAGE = `Usage:
  sysdml parse <file>
  sysdml simulate <file> [--csv]
  sysdml --help
`;

async function main(): Promise<number> {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		process.stdout.write(USAGE);
		return args.length === 0 ? 1 : 0;
	}

	const subcommand = args[0];
	const subcommandArgs = args.slice(1);

	switch (subcommand) {
		case "parse":
			return await dispatchParse(subcommandArgs);
		case "simulate":
			return await dispatchSimulate(subcommandArgs);
		default:
			process.stderr.write(`Unknown subcommand: ${subcommand}\n${USAGE}`);
			return 1;
	}
}

async function dispatchParse(args: string[]): Promise<number> {
	const { positionals } = parseArgs({ args, allowPositionals: true });
	const file = positionals[0];
	if (!file) {
		process.stderr.write(`Missing file argument.\n${USAGE}`);
		return 1;
	}
	const source = await readFile(file, "utf8");
	const result = runParseCommand(source);
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	return result.exitCode;
}

async function dispatchSimulate(args: string[]): Promise<number> {
	const { values, positionals } = parseArgs({
		args,
		options: { csv: { type: "boolean", default: false } },
		allowPositionals: true,
	});
	const file = positionals[0];
	if (!file) {
		process.stderr.write(`Missing file argument.\n${USAGE}`);
		return 1;
	}
	const source = await readFile(file, "utf8");
	const result = runSimulateCommand(source, {
		format: values.csv ? "csv" : "json",
	});
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	return result.exitCode;
}

main()
	.then((exitCode) => process.exit(exitCode))
	.catch((error) => {
		process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exit(2);
	});
