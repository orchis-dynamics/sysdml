<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { IR } from "@sysdml/ir";
import Canvas from "./canvas/Canvas.vue";
import { createTransport } from "./transport/index.js";

const ir = ref<IR | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(() => {
  const transport = createTransport();

  transport.onIR((incoming) => {
    ir.value = incoming;
    errorMessage.value = null;
  });

  transport.onError((message) => {
    errorMessage.value = message;
  });

  transport.start();
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
    <Canvas :ir="ir" class="flex-1" />
  </div>
</template>
