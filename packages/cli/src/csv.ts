import type { IR, SimRow, SimulationResult } from "@sysdml/contracts";

function formatCell(row: SimRow, columnId: string): string {
	return columnId in row ? String(row[columnId]) : "";
}

export function formatCsv(ir: IR, result: SimulationResult): string {
	const columnIds = [
		...ir.stocks.map((stock) => stock.id),
		...ir.auxiliaries.map((auxiliary) => auxiliary.id),
		...ir.flows.map((flow) => flow.id),
	];

	const headerRow = ["time", ...columnIds].join(",");
	const dataRows = result.rows.map((row) =>
		[
			String(row.time),
			...columnIds.map((columnId) => formatCell(row, columnId)),
		].join(","),
	);

	return [headerRow, ...dataRows].join("\n") + "\n";
}
