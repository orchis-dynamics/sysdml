import { Project } from "@simlin/engine";
import { DirectBackend } from "@simlin/engine/direct-backend";
import { SimlinJsonFormat } from "@simlin/engine/internal/types";
import type {
	IR,
	SimDiagnostic,
	SimRow,
	SimulationResult,
	Simulator,
} from "@sysdml/contracts";

import { irToSimlinProject } from "./ir-to-simlin.js";
import { getConfiguredWasmSource } from "./wasm.js";

let readyBackend: Promise<DirectBackend> | null = null;

function backend(): Promise<DirectBackend> {
	if (readyBackend === null) {
		const instance = new DirectBackend();
		readyBackend = instance
			.init(getConfiguredWasmSource())
			.then(() => instance);
	}
	return readyBackend;
}

function transposeRun(
	time: Float64Array,
	results: ReadonlyMap<string, Float64Array>,
	variableNames: readonly string[],
): SimRow[] {
	const rows: SimRow[] = [];
	for (let step = 0; step < time.length; step++) {
		const row: SimRow = { time: time[step] };
		for (const name of variableNames) {
			if (name === "time") continue;
			const series = results.get(name);
			if (series !== undefined) {
				row[name] = series[step];
			}
		}
		rows.push(row);
	}
	return rows;
}

export class SimlinSimulator implements Simulator {
	async simulate(ir: IR): Promise<SimulationResult> {
		const engine = await backend();
		const projectJson = JSON.stringify(irToSimlinProject(ir));
		const handle = await engine.projectOpenJson(
			new TextEncoder().encode(projectJson),
			SimlinJsonFormat.Native,
		);
		const project = new Project(handle, engine);
		const model = await project.mainModel();

		const issues = await model.check();
		const diagnostics: SimDiagnostic[] = issues.map((issue) => ({
			code: issue.severity,
			message: issue.variable
				? `${issue.variable}: ${issue.message}`
				: issue.message,
		}));

		const run = await model.run();
		const rows = transposeRun(run.time, run.results, run.varNames);

		return { rows, diagnostics };
	}
}
