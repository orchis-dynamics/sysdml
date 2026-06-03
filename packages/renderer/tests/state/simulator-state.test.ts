// @vitest-environment happy-dom
import type { SimulationResult } from "@sysdml/contracts";
import { describe, expect, test } from "vitest";
import { createApp, defineComponent, h } from "vue";

import {
	useProvideSimulatorState,
	useSimulatorState,
} from "../../src/state/simulator-state.js";

function runInSetup<T>(composable: () => T): T {
	let result: T | undefined;
	const app = createApp(
		defineComponent({
			setup() {
				result = composable();
				return () => h("div");
			},
		}),
	);
	app.mount(document.createElement("div"));
	app.unmount();
	return result as T;
}

const stubResult: SimulationResult = { rows: [{ time: 0 }], diagnostics: [] };

describe("simulator state — variable selection", () => {
	test("toggleVariable selects then deselects a variable", () => {
		const state = runInSetup(() => useProvideSimulatorState());
		expect(state.isVariableSelected("stock_a")).toBe(false);
		state.toggleVariable("stock_a");
		expect(state.isVariableSelected("stock_a")).toBe(true);
		state.toggleVariable("stock_a");
		expect(state.isVariableSelected("stock_a")).toBe(false);
	});

	test("selectVariable and deselectVariable update membership", () => {
		const state = runInSetup(() => useProvideSimulatorState());
		state.selectVariable("aux_b");
		expect(state.isVariableSelected("aux_b")).toBe(true);
		state.deselectVariable("aux_b");
		expect(state.isVariableSelected("aux_b")).toBe(false);
	});

	test("clearSelection removes every selected variable", () => {
		const state = runInSetup(() => useProvideSimulatorState());
		state.selectVariable("a");
		state.selectVariable("b");
		state.clearSelection();
		expect(state.isVariableSelected("a")).toBe(false);
		expect(state.isVariableSelected("b")).toBe(false);
	});
});

describe("simulator state — simulation outcome", () => {
	test("setSimulation stores the result and clears any error", () => {
		const state = runInSetup(() => useProvideSimulatorState());
		state.setSimulationError("previous failure");
		state.setSimulation(stubResult);
		expect(state.simulation.value).toEqual(stubResult);
		expect(state.simulationError.value).toBe(null);
	});

	test("setSimulationError stores the message and clears the result", () => {
		const state = runInSetup(() => useProvideSimulatorState());
		state.setSimulation(stubResult);
		state.setSimulationError("boom");
		expect(state.simulation.value).toBe(null);
		expect(state.simulationError.value).toBe("boom");
	});
});

describe("useSimulatorState", () => {
	test("throws when called without a provider", () => {
		expect(() => runInSetup(() => useSimulatorState())).toThrow(
			/without a provider/,
		);
	});
});
