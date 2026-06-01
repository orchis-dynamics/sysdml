import type { SimRow, SimulationResult } from "@sysdml/simulator";

export interface TimeseriesPlotData {
	rows: SimRow[];
	variableIds: string[];
}

const TIME_COLUMN_KEY = "time";

function collectPlottableVariableIds(rows: SimRow[]): Set<string> {
	if (rows.length === 0) {
		return new Set<string>();
	}
	const variableKeys = Object.keys(rows[0]).filter(
		(key) => key !== TIME_COLUMN_KEY,
	);
	return new Set<string>(variableKeys);
}

export function selectTimeseriesPlotData(
	simulation: SimulationResult | null,
	selectedVariableIds: ReadonlySet<string>,
): TimeseriesPlotData {
	if (!simulation || simulation.rows.length === 0) {
		return { rows: [], variableIds: [] };
	}
	const plottableVariableIds = collectPlottableVariableIds(simulation.rows);
	const variableIds = [...selectedVariableIds]
		.filter((variableId) => plottableVariableIds.has(variableId))
		.sort();
	return { rows: simulation.rows, variableIds };
}
