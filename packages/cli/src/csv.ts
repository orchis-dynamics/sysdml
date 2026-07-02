import type { IR, SimulationResult } from "@sysdml/contracts";

export function formatCsv(ir: IR, result: SimulationResult): string {
	const columnIds = [
		...ir.stocks.map((stock) => stock.id),
		...ir.auxiliaries.map((aux) => aux.id),
		...ir.flows.map((flow) => flow.id),
	];

	const headerRow = ["time", ...columnIds].join(",");
	const dataRows = result.rows.map((row) =>
		[String(row.time), ...columnIds.map((id) => String(row[id]))].join(","),
	);

	return [headerRow, ...dataRows].join("\n") + "\n";
}
