#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { runParseCommand } from "./parse.js";
import { runSimulateCommand } from "./simulate.js";
import type { CommandResult } from "./types.js";

const USAGE = `Usage:
  sysdml parse <file>
  sysdml simulate <file> [--csv]
  sysdml --help
`;

async function main(): Promise<number> {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		process.stderr.write(USAGE);
		return 1;
	}

	if (args.includes("--help") || args.includes("-h")) {
		process.stdout.write(USAGE);
		return 0;
	}

	const subcommandIndex = args.findIndex((arg) => !arg.startsWith("-"));
	if (subcommandIndex === -1) {
		process.stderr.write(`No subcommand provided.\n${USAGE}`);
		return 1;
	}

	const subcommand = args[subcommandIndex];
	const subcommandArgs = [
		...args.slice(0, subcommandIndex),
		...args.slice(subcommandIndex + 1),
	];

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

type LoadSourceResult =
	| { ok: true; source: string }
	| { ok: false; message: string };

async function loadSource(file: string): Promise<LoadSourceResult> {
	try {
		return { ok: true, source: await readFile(file, "utf8") };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, message: `Cannot read file ${file}: ${message}` };
	}
}

function writeCommandResult(result: CommandResult): void {
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
}

async function dispatchParse(args: string[]): Promise<number> {
	let positionals: string[];
	try {
		({ positionals } = parseArgs({ args, allowPositionals: true }));
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n${USAGE}`,
		);
		return 1;
	}
	const file = positionals[0];
	if (!file) {
		process.stderr.write(`Missing file argument.\n${USAGE}`);
		return 1;
	}
	const loaded = await loadSource(file);
	if (!loaded.ok) {
		process.stderr.write(`${loaded.message}\n`);
		return 1;
	}
	const result = await runParseCommand(loaded.source);
	writeCommandResult(result);
	return result.exitCode;
}

async function dispatchSimulate(args: string[]): Promise<number> {
	let values: { csv?: boolean };
	let positionals: string[];
	try {
		({ values, positionals } = parseArgs({
			args,
			options: { csv: { type: "boolean", default: false } },
			allowPositionals: true,
		}));
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n${USAGE}`,
		);
		return 1;
	}
	const file = positionals[0];
	if (!file) {
		process.stderr.write(`Missing file argument.\n${USAGE}`);
		return 1;
	}
	const loaded = await loadSource(file);
	if (!loaded.ok) {
		process.stderr.write(`${loaded.message}\n`);
		return 1;
	}
	const result = await runSimulateCommand(loaded.source, {
		format: values.csv ? "csv" : "json",
	});
	writeCommandResult(result);
	return result.exitCode;
}

main()
	.then((exitCode) => process.exit(exitCode))
	.catch((error) => {
		process.stderr.write(
			`Fatal: ${error instanceof Error ? error.message : String(error)}\n`,
		);
		process.exit(2);
	});
