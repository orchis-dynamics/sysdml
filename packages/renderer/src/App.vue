<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { IR } from "@sysdml/ir";
import type { SimulationResult } from "@sysdml/simulator";
import Canvas from "./canvas/Canvas.vue";
import { createTransport } from "./transport/index.js";
import { createDefaultSimulatorClient } from "./simulation/client.js";

const ir = ref<IR | null>(null);
const simulation = ref<SimulationResult | null>(null);
const errorMessage = ref<string | null>(null);
const simulationError = ref<string | null>(null);

let simulator: ReturnType<typeof createDefaultSimulatorClient> | null = null;

onMounted(() => {
  simulator = createDefaultSimulatorClient();
  simulator.onResult((result) => {
    simulation.value = result;
    simulationError.value = null;
  });
  simulator.onError((message) => {
    simulation.value = null;
    simulationError.value = message;
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
