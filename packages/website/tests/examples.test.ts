import { describe, expect, test } from "vitest";

import {
	exampleModels,
	defaultExampleName,
	getDefaultExample,
} from "../app/lib/examples";

describe("examples", () => {
	test("bundles all six example models", () => {
		expect(exampleModels).toHaveLength(6);
	});

	test("every model has a non-empty source and a label", () => {
		for (const model of exampleModels) {
			expect(model.source.length).toBeGreaterThan(0);
			expect(model.label.length).toBeGreaterThan(0);
		}
	});

	test("the default is population_growth and resolves", () => {
		expect(defaultExampleName).toBe("population_growth");
		const model = getDefaultExample();
		expect(model.name).toBe("population_growth");
		expect(model.source).toContain("sfd population_growth");
	});

	test("models are sorted alphabetically by label", () => {
		const labels = exampleModels.map((model) => model.label);
		const sorted = [...labels].sort((left, right) => left.localeCompare(right));
		expect(labels).toEqual(sorted);
	});
});
