import type { SimulationResult } from "@sysdml/contracts";
import { createInjectionState } from "@vueuse/core";
import { ref } from "vue";

function createVariableSelection() {
	const selectedVariableIds = ref<Set<string>>(new Set<string>());

	function isVariableSelected(variableId: string): boolean {
		return selectedVariableIds.value.has(variableId);
	}

	function toggleVariable(variableId: string): void {
		if (isVariableSelected(variableId)) {
			selectedVariableIds.value.delete(variableId);
		} else {
			selectedVariableIds.value.add(variableId);
		}
	}

	return {
		selectedVariableIds,
		isVariableSelected,
		toggleVariable,
	};
}

function createSimulationOutcome() {
	const simulation = ref<SimulationResult | null>(null);
	const simulationError = ref<string | null>(null);

	function setSimulation(result: SimulationResult): void {
		simulation.value = result;
		simulationError.value = null;
	}

	function setSimulationError(message: string): void {
		simulation.value = null;
		simulationError.value = message;
	}

	return { simulation, simulationError, setSimulation, setSimulationError };
}

const [useProvideSimulatorState, useInjectedSimulatorState] =
	createInjectionState(() => ({
		...createVariableSelection(),
		...createSimulationOutcome(),
	}));

export { useProvideSimulatorState };

export function useSimulatorState() {
	const state = useInjectedSimulatorState();
	if (!state) {
		throw new Error(
			"useSimulatorState() was called without a provider. Call useProvideSimulatorState() in an ancestor component.",
		);
	}
	return state;
}
