import { describe, expect, it } from "vitest";

import { formatCsv } from "../src/csv.js";
import { runPipeline } from "../src/pipeline.js";

describe("formatCsv", () => {
	it("emits a header row of time + variables in IR order, then one data row per step", async () => {
		const source = `sfd Test

time {
	start: 0
	end: 2
	step: 1
}

stock population {
	init: 100
}
`;
		const { ir, simulation } = await runPipeline(source);
		const csv = formatCsv(ir!, simulation!);

		expect(csv).toBe("time,population\n0,100\n1,100\n2,100\n");
	});

	it("orders columns: stocks first, then aux, then flows, all in declaration order", async () => {
		const source = `sfd Test

time {
	start: 0
	end: 1
	step: 1
}

stock a {
	init: 1
}

aux b = 2

stock c {
	init: 3
}

flow d {
	from: a
	to: c
	rate: b
}

aux e = 4
`;
		const { ir, simulation } = await runPipeline(source);
		const csv = formatCsv(ir!, simulation!);

		const headerLine = csv.split("\n")[0];
		expect(headerLine).toBe("time,a,c,b,e,d");
	});
});
