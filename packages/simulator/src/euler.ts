import type { IR, IRGraphicalFunction } from "@sysdml/contracts";

import { desugarIR } from "./desugar.js";
import { evalExpr } from "./eval.js";
import { toposort } from "./toposort.js";
import type {
	Env,
	EvalContext,
	SimContext,
	SimDiagnostic,
	SimRow,
	SimulationResult,
	Simulator,
} from "./types.js";
import { SimDiagnosticCode, SimulationHaltedError } from "./types.js";

export class EulerSimulator implements Simulator {
	simulate(ir: IR): SimulationResult {
		const diagnostics: SimDiagnostic[] = [];
		const rows: SimRow[] = [];

		const { ir: desugaredIR, diagnostics: desugarDiag } = desugarIR(ir);
		diagnostics.push(...desugarDiag);

		const {
			orderedAux,
			orderedFlows,
			diagnostics: sortDiag,
		} = toposort(desugaredIR.auxiliaries, desugaredIR.flows);
		diagnostics.push(...sortDiag);
		if (sortDiag.some((d) => d.code === SimDiagnosticCode.CYCLE_IN_AUX)) {
			return { rows: [], diagnostics };
		}

		const gfRegistry = new Map<string, IRGraphicalFunction>(
			desugaredIR.graphicalFunctions.map((gf) => [gf.id, gf]),
		);

		const { start, end, step } = desugaredIR.time;

		try {
			const stockState: Env = {};
			const bootstrapCtx = buildEvalContext(
				{},
				{ t: start, start, end, step },
				{},
				{},
				gfRegistry,
			);
			for (const stock of desugaredIR.stocks) {
				stockState[stock.id] = evalExpr(stock.init, bootstrapCtx);
			}

			const initEnv = buildInitEnv(
				stockState,
				orderedAux,
				orderedFlows,
				start,
				end,
				step,
				gfRegistry,
			);

			let prevEnv: Env = { ...initEnv };

			for (let t = start; t <= end + step * 1e-10; t = roundStep(t + step)) {
				const env: Env = { ...stockState };
				const simCtx: SimContext = { t, start, end, step };
				const evalCtx = buildEvalContext(
					env,
					simCtx,
					initEnv,
					prevEnv,
					gfRegistry,
				);

				for (const auxVar of orderedAux) {
					env[auxVar.id] = evalExpr(auxVar.expr, evalCtx);
				}

				const flowValues: Env = {};
				for (const flow of orderedFlows) {
					flowValues[flow.id] = evalExpr(flow.rate, evalCtx);
					env[flow.id] = flowValues[flow.id];
				}

				rows.push(buildRow(t, ir, stockState, env, flowValues));
				prevEnv = { ...env };

				for (const stock of desugaredIR.stocks) {
					let netFlow = 0;
					for (const flow of orderedFlows) {
						if (flow.to === stock.id) netFlow += flowValues[flow.id];
						if (flow.from === stock.id) netFlow -= flowValues[flow.id];
					}
					stockState[stock.id] += netFlow * step;
				}
			}
		} catch (err) {
			if (err instanceof SimulationHaltedError) {
				diagnostics.push(err.diagnostic);
				return { rows, diagnostics };
			}
			throw err;
		}

		return { rows, diagnostics };
	}
}

function buildInitEnv(
	stockState: Env,
	orderedAux: IR["auxiliaries"],
	orderedFlows: IR["flows"],
	start: number,
	end: number,
	step: number,
	gfRegistry: ReadonlyMap<string, IRGraphicalFunction>,
): Env {
	const initEnv: Env = { ...stockState };
	const simCtx: SimContext = { t: start, start, end, step };
	const evalCtx = buildEvalContext(
		initEnv,
		simCtx,
		initEnv,
		initEnv,
		gfRegistry,
	);
	for (const auxVar of orderedAux)
		initEnv[auxVar.id] = evalExpr(auxVar.expr, evalCtx);
	for (const flow of orderedFlows)
		initEnv[flow.id] = evalExpr(flow.rate, evalCtx);
	return initEnv;
}

function buildEvalContext(
	env: Env,
	sim: SimContext,
	initEnv: Env,
	prevEnv: Env,
	gfRegistry: ReadonlyMap<string, IRGraphicalFunction>,
): EvalContext {
	return { env, sim, initEnv, prevEnv, gfRegistry };
}

function buildRow(
	t: number,
	originalIR: IR,
	stockState: Env,
	env: Env,
	flowValues: Env,
): SimRow {
	const row: SimRow = { time: t };
	for (const stock of originalIR.stocks) row[stock.id] = stockState[stock.id];
	for (const auxVar of originalIR.auxiliaries) row[auxVar.id] = env[auxVar.id];
	for (const flow of originalIR.flows) row[flow.id] = flowValues[flow.id] ?? 0;
	return row;
}

function roundStep(value: number): number {
	return parseFloat(value.toFixed(10));
}
