<script setup lang="ts">
import type {
	ConnectionRoutingEdit,
	ElementPositionEdit,
	IR,
} from "@sysdml/contracts";
import { computed, onMounted, onUnmounted, toRaw, watch } from "vue";

import Canvas from "./canvas/Canvas.vue";
import GraphPanel from "./graph/GraphPanel.vue";
import TimeseriesLineChart from "./graph/TimeseriesLineChart.vue";
import { createDefaultSimulatorClient } from "./simulation/client.js";
import SimulationDiagnosticsBanner from "./SimulationDiagnosticsBanner.vue";
import { useProvideSimulatorState } from "./state/simulator-state.js";

const props = defineProps<{
	ir: IR | null;
	errorMessage: string | null;
}>();

const emit = defineEmits<{
	routingEdit: [edit: ConnectionRoutingEdit];
	positionEdit: [edits: ElementPositionEdit[]];
	pinMissingPositions: [];
}>();

const { simulation, simulationError, setSimulation, setSimulationError } =
	useProvideSimulatorState();

const simulationDiagnostics = computed(
	() => simulation.value?.diagnostics ?? [],
);

let simulator: ReturnType<typeof createDefaultSimulatorClient> | null = null;

onMounted(() => {
	simulator = createDefaultSimulatorClient();
	simulator.onResult((result) => {
		setSimulation(result);
	});
	simulator.onError((message) => {
		setSimulationError(message);
	});
	if (props.ir) {
		simulator.simulate(toRaw(props.ir));
	}
});

watch(
	() => props.ir,
	(incoming) => {
		if (incoming) {
			simulator?.simulate(toRaw(incoming));
		}
	},
);

onUnmounted(() => {
	simulator?.dispose();
	simulator = null;
});

function onRoutingEdit(edit: ConnectionRoutingEdit): void {
	emit("routingEdit", edit);
}

function onPositionEdit(edits: ElementPositionEdit[]): void {
	emit("positionEdit", edits);
}

function onPinMissingPositions(): void {
	emit("pinMissingPositions");
}
</script>

<template>
	<div class="w-full h-full flex flex-col">
		<div
			v-if="errorMessage"
			class="bg-red-50 border-b border-red-200 text-red-700 text-xs font-mono px-4 py-2 shrink-0"
		>
			{{ errorMessage }}
		</div>
		<div
			v-if="simulationError"
			class="bg-amber-50 border-b border-amber-200 text-amber-700 text-xs font-mono px-4 py-2 shrink-0"
		>
			Simulation: {{ simulationError }}
		</div>
		<SimulationDiagnosticsBanner :diagnostics="simulationDiagnostics" />
		<Canvas
			:ir="ir"
			class="flex-1 min-h-0"
			@routing-edit="onRoutingEdit"
			@position-edit="onPositionEdit"
			@pin-missing-positions="onPinMissingPositions"
		/>
		<GraphPanel class="h-64 shrink-0">
			<template #default="{ rows, variableIds }">
				<TimeseriesLineChart :rows="rows" :variable-ids="variableIds" />
			</template>
		</GraphPanel>
	</div>
</template>
