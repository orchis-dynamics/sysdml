import { Project } from "@simlin/engine";
import type { Model, ModelIssue } from "@simlin/engine";
import { DirectBackend } from "@simlin/engine/direct-backend";
import { canonicalizeIdent } from "@simlin/engine/internal/canonicalize";
import { SimlinJsonFormat } from "@simlin/engine/internal/types";
import type {
	IR,
	SimDiagnostic,
	SimRow,
	SimulationResult,
	Simulator,
} from "@sysdml/contracts";

import { collectUnsupportedBuiltinDiagnostics } from "./engine-support.js";
import { irToSimlinProject } from "./ir-to-simlin.js";
import { resolveWasmSource } from "./wasm-source.node.js";

let readyBackend: Promise<DirectBackend> | null = null;

function backend(): Promise<DirectBackend> {
	if (readyBackend === null) {
		const instance = new DirectBackend();
		const pendingBackend = instance
			.init(resolveWasmSource())
			.then(() => instance);
		pendingBackend.catch(() => {
			if (readyBackend === pendingBackend) {
				readyBackend = null;
			}
		});
		readyBackend = pendingBackend;
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

interface VariableSeries {
	id: string;
	values: Float64Array;
}

function resolveVariableSeries(
	results: ReadonlyMap<string, Float64Array>,
	variableIds: readonly string[],
): VariableSeries[] {
	const resolved: VariableSeries[] = [];
	for (const id of variableIds) {
		const values = results.get(canonicalizeIdent(id));
		if (values !== undefined) {
			resolved.push({ id, values });
		}
	}
	return resolved;
}

function transposeRun(
	time: Float64Array,
	results: ReadonlyMap<string, Float64Array>,
	variableIds: readonly string[],
): SimRow[] {
	const series = resolveVariableSeries(results, variableIds);
	const rows: SimRow[] = [];
	for (let step = 0; step < time.length; step++) {
		const row: SimRow = { time: time[step] };
		for (const entry of series) {
			row[entry.id] = entry.values[step];
		}
		rows.push(row);
	}
	return rows;
}

function checkIssueToDiagnostic(issue: ModelIssue): SimDiagnostic {
	const message = issue.variable
		? `${issue.variable}: ${issue.message}`
		: issue.message;
	if (issue.severity === "info") {
		return { code: issue.severity, message };
	}
	return { code: issue.severity, message, severity: issue.severity };
}

function runFailureDiagnostic(error: unknown): SimDiagnostic {
	return {
		code: "error",
		message: error instanceof Error ? error.message : String(error),
		severity: "error",
	};
}

interface DisposableHandle {
	dispose(): Promise<void>;
}

async function disposeIgnoringErrors(handle: DisposableHandle): Promise<void> {
	try {
		await handle.dispose();
	} catch {
		return;
	}
}

async function openProject(engine: DirectBackend, ir: IR): Promise<Project> {
	const projectJson = JSON.stringify(irToSimlinProject(ir));
	const handle = await engine.projectOpenJson(
		new TextEncoder().encode(projectJson),
		SimlinJsonFormat.Native,
	);
	return new Project(handle, engine);
}

async function collectCheckDiagnostics(model: Model): Promise<SimDiagnostic[]> {
	const issues = await model.check();
	return issues.map(checkIssueToDiagnostic);
}

async function runModelToRows(
	model: Model,
	variableIds: readonly string[],
): Promise<SimRow[]> {
	const sim = await model.simulate();
	try {
		await sim.runToEnd();
		const run = await sim.getRun();
		return transposeRun(run.time, run.results, variableIds);
	} finally {
		await disposeIgnoringErrors(sim);
	}
}

export class SimlinSimulator implements Simulator {
	async simulate(ir: IR): Promise<SimulationResult> {
		const unsupportedBuiltinDiagnostics =
			collectUnsupportedBuiltinDiagnostics(ir);
		if (unsupportedBuiltinDiagnostics.length > 0) {
			return { rows: [], diagnostics: unsupportedBuiltinDiagnostics };
		}
		const diagnostics: SimDiagnostic[] = [];
		try {
			const engine = await backend();
			const project = await openProject(engine, ir);
			try {
				const model = await project.mainModel();
				diagnostics.push(...(await collectCheckDiagnostics(model)));
				const rows = await runModelToRows(model, modelVariableIds(ir));
				return { rows, diagnostics };
			} finally {
				await disposeIgnoringErrors(project);
			}
		} catch (error) {
			diagnostics.push(runFailureDiagnostic(error));
			return { rows: [], diagnostics };
		}
	}
}
