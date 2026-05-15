#!/usr/bin/env node
import { readFileSync } from "fs";

import { parseSource } from "./index.js";

const file = process.argv[2];
if (!file) {
	console.error("Usage: sysdml-parse <file.sysdml>");
	process.exit(1);
}

let source: string;
try {
	source = readFileSync(file, "utf8");
} catch {
	console.error(`Cannot read file: ${file}`);
	process.exit(1);
}

const { ast, diagnostics } = parseSource(source);

if (diagnostics.length > 0) {
	console.error("--- Diagnostics ---");
	for (const diagnostic of diagnostics) {
		console.error(
			`  [${diagnostic.span.start.line}:${diagnostic.span.start.col}] ${diagnostic.message}`,
		);
	}
}

if (ast) {
	console.log(JSON.stringify(ast, null, 2));
} else {
	process.exit(1);
}
