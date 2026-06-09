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

let readyBackend: Promise<DirectBackend> | null = null;

function backend(): Promise<DirectBackend> {
	if (readyBackend === null) {
		const instance = new DirectBackend();
		readyBackend = instance.init().then(() => instance);
	}
	return readyBackend;
}

function modelVariableIds(ir: IR): string[] {
	return [
		...ir.stocks.map((stock) => stock.id),
		...ir.auxiliaries.map((auxiliary) => auxiliary.id),
		...ir.flows.map((flow) => flow.id),
	];
}

function transposeRun(
	time: Float64Array,
	results: ReadonlyMap<string, Float64Array>,
	variableIds: readonly string[],
): SimRow[] {
	const rows: SimRow[] = [];
	for (let step = 0; step < time.length; step++) {
		const row: SimRow = { time: time[step] };
		for (const id of variableIds) {
			const series = results.get(id);
			if (series !== undefined) {
				row[id] = series[step];
			}
		}
		rows.push(row);
	}
	return rows;
}

export class SimlinSimulator implements Simulator {
	async simulate(ir: IR): Promise<SimulationResult> {
		try {
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
			const rows = transposeRun(run.time, run.results, modelVariableIds(ir));

			return { rows, diagnostics };
		} catch (error) {
			return {
				rows: [],
				diagnostics: [
					{
						code: "error",
						message: error instanceof Error ? error.message : String(error),
					},
				],
			};
		}
	}
}
