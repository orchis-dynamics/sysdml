<script setup lang="ts">
import type { ConnectionRoutingEdit, IR } from "@sysdml/contracts";
import { ref, computed, onMounted, onUnmounted } from "vue";

import Canvas from "./canvas/Canvas.vue";
import GraphPanel from "./graph/GraphPanel.vue";
import TimeseriesLineChart from "./graph/TimeseriesLineChart.vue";
import { createDefaultSimulatorClient } from "./simulation/client.js";
import SimulationDiagnosticsBanner from "./SimulationDiagnosticsBanner.vue";
import { useProvideSimulatorState } from "./state/simulator-state.js";
import { createTransport } from "./transport/index.js";
import type { IRTransport } from "./transport/types.js";

const ir = ref<IR | null>(null);
const errorMessage = ref<string | null>(null);

const { simulation, simulationError, setSimulation, setSimulationError } =
	useProvideSimulatorState();

const simulationDiagnostics = computed(
	() => simulation.value?.diagnostics ?? [],
);

let simulator: ReturnType<typeof createDefaultSimulatorClient> | null = null;
let transport: IRTransport | null = null;

onMounted(() => {
	simulator = createDefaultSimulatorClient();
	simulator.onResult((result) => {
		setSimulation(result);
	});
	simulator.onError((message) => {
		setSimulationError(message);
	});

	transport = createTransport();

	transport.onIR((incoming) => {
		ir.value = incoming;
		errorMessage.value = null;
		simulator?.simulate(incoming);
	});

	transport.onError((message) => {
		errorMessage.value = message;
	});

	transport.start();
});

onUnmounted(() => {
	simulator?.dispose();
	simulator = null;
	transport?.stop();
	transport = null;
});

function onRoutingEdit(edit: ConnectionRoutingEdit): void {
	transport?.sendRoutingEdit(edit);
}
</script>

<template>
	<div class="w-screen h-screen flex flex-col">
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
		<Canvas :ir="ir" class="flex-1 min-h-0" @routing-edit="onRoutingEdit" />
		<GraphPanel class="h-64 shrink-0">
			<template #default="{ rows, variableIds }">
				<TimeseriesLineChart :rows="rows" :variable-ids="variableIds" />
			</template>
		</GraphPanel>
	</div>
</template>
