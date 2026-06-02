import { readFileSync } from "node:fs";

import { compileAST } from "@sysdml/ir";
import { Project } from "@simlin/engine";
import { parseSource } from "@sysdml/parser";

import { irToSimlinProject } from "../src/simlinBackend.ts";

const defaultModel = `
sfd population_growth
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

function readModelSource(): string {
	const path = process.argv[2];
	return path ? readFileSync(path, "utf8") : defaultModel;
}

function compileToIR(source: string) {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (parseDiagnostics.length > 0) {
		throw new Error(`Parse error: ${parseDiagnostics[0].message}`);
	}
	const { ir, diagnostics: irDiagnostics } = compileAST(ast!);
	if (irDiagnostics.length > 0) {
		throw new Error(`IR error: ${irDiagnostics[0].message}`);
	}
	return ir!;
}

async function main() {
	const ir = compileToIR(readModelSource());
	const project = await Project.openJson(JSON.stringify(irToSimlinProject(ir)));

	const errors = project.getErrors();
	if (errors.length > 0) {
		console.error("Engine errors:", errors);
		process.exit(1);
	}

	const model = await project.mainModel();
	const run = await model.run();

	const output = Object.fromEntries(
		[...run.results].map(([name, series]) => [name, Array.from(series)]),
	);
	console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
