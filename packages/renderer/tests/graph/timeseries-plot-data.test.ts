import type { SimulationResult } from "@sysdml/simulator";
import { describe, expect, test } from "vitest";

import { selectTimeseriesPlotData } from "../../src/graph/timeseries-plot-data.js";

function resultWith(rows: SimulationResult["rows"]): SimulationResult {
	return { rows, diagnostics: [] };
}

describe("selectTimeseriesPlotData", () => {
	test("returns empty plot data when there is no simulation", () => {
		const plotData = selectTimeseriesPlotData(null, new Set(["stock_a"]));
		expect(plotData).toEqual({ rows: [], variableIds: [] });
	});

	test("returns empty plot data when the simulation has no rows", () => {
		const plotData = selectTimeseriesPlotData(resultWith([]), new Set(["stock_a"]));
		expect(plotData).toEqual({ rows: [], variableIds: [] });
	});

	test("returns no variable ids when nothing is selected", () => {
		const result = resultWith([{ time: 0, stock_a: 1 }]);
		const plotData = selectTimeseriesPlotData(result, new Set());
		expect(plotData.variableIds).toEqual([]);
		expect(plotData.rows).toBe(result.rows);
	});

	test("keeps only selected ids that are present in the rows, sorted", () => {
		const result = resultWith([
			{ time: 0, stock_a: 1, aux_b: 2 },
			{ time: 1, stock_a: 3, aux_b: 4 },
		]);
		const plotData = selectTimeseriesPlotData(
			result,
			new Set(["aux_b", "stock_a", "missing_c"]),
		);
		expect(plotData.variableIds).toEqual(["aux_b", "stock_a"]);
	});

	test("never treats the time column as a plottable variable", () => {
		const result = resultWith([{ time: 0, stock_a: 1 }]);
		const plotData = selectTimeseriesPlotData(result, new Set(["time"]));
		expect(plotData.variableIds).toEqual([]);
	});

	test("passes the original rows array through unchanged", () => {
		const result = resultWith([{ time: 0, stock_a: 1 }]);
		const plotData = selectTimeseriesPlotData(result, new Set(["stock_a"]));
		expect(plotData.rows).toBe(result.rows);
	});
});
