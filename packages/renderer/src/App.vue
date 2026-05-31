<script setup lang="ts">
import type { IR } from "@sysdml/ir";
import { ref, onMounted, onUnmounted } from "vue";

import Canvas from "./canvas/Canvas.vue";
import { createDefaultSimulatorClient } from "./simulation/client.js";
import { useProvideSimulatorState } from "./state/simulator-state.js";
import { createTransport } from "./transport/index.js";

const ir = ref<IR | null>(null);
const errorMessage = ref<string | null>(null);

const { simulationError, setSimulation, setSimulationError } =
	useProvideSimulatorState();

let simulator: ReturnType<typeof createDefaultSimulatorClient> | null = null;

onMounted(() => {
	simulator = createDefaultSimulatorClient();
	simulator.onResult((result) => {
		setSimulation(result);
	});
	simulator.onError((message) => {
		setSimulationError(message);
	});

	const transport = createTransport();

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
});
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
		<Canvas :ir="ir" class="flex-1" />
	</div>
</template>
