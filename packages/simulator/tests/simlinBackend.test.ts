import { compileAST } from "@sysdml/ir";
import type { IR } from "@sysdml/ir";
import { parseSource } from "@sysdml/parser";
import { Project } from "@simlin/engine";
import { describe, test, expect } from "vitest";

import { EulerSimulator } from "../src/index.js";
import { irToSimlinProject } from "../src/simlinBackend.js";

function buildIR(source: string): IR {
	const { ast, diagnostics: parseDiagnostics } = parseSource(source);
	if (parseDiagnostics.length > 0) {
		throw new Error(`Parse: ${parseDiagnostics[0].message}`);
	}
	const { ir, diagnostics: irDiagnostics } = compileAST(ast!);
	if (irDiagnostics.length > 0) {
		throw new Error(`IR: ${irDiagnostics[0].message}`);
	}
	return ir!;
}

const growthModel = `
sfd population_growth
time { start: 0 end: 10 step: 1 }
stock population { init: 100 }
aux birth_rate = 0.02
flow births { from: null to: population rate: population * birth_rate }
`.trim();

describe("irToSimlinProject", () => {
	test("inverts flow direction into stock inflows/outflows", () => {
		const project = irToSimlinProject(buildIR(growthModel));
		const [model] = project.models;
		const [stock] = model.stocks;
		expect(stock.name).toBe("population");
		expect(stock.inflows).toEqual(["births"]);
		expect(stock.outflows).toEqual([]);
		expect(stock.initialEquation).toBe("100");
	});

	test("serializes equations as strings", () => {
		const project = irToSimlinProject(buildIR(growthModel));
		const [model] = project.models;
		expect(model.flows[0].equation).toBe("(population * birth_rate)");
		expect(model.auxiliaries[0].equation).toBe("0.02");
	});

	test("maps the time block into sim specs", () => {
		const project = irToSimlinProject(buildIR(growthModel));
		expect(project.simSpecs).toEqual({
			startTime: 0,
			endTime: 10,
			dt: "1",
			method: "euler",
		});
	});
});

describe("Simlin engine via the mapper", () => {
	test("matches the EulerSimulator population series", async () => {
		const ir = buildIR(growthModel);

		const ownResult = new EulerSimulator().simulate(ir);
		const ownSeries = ownResult.rows.map((row) => row.population);

		const project = await Project.openJson(
			JSON.stringify(irToSimlinProject(ir)),
		);
		const model = await project.mainModel();
		const run = await model.run();
		const simlinSeries = Array.from(run.results.get("population") ?? []);

		expect(simlinSeries.length).toBe(ownSeries.length);
		for (let index = 0; index < ownSeries.length; index++) {
			expect(simlinSeries[index]).toBeCloseTo(ownSeries[index], 9);
		}
	});
});
