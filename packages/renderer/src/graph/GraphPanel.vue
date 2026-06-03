<script setup lang="ts">
import type { SimRow } from "@sysdml/contracts";
import { computed } from "vue";

import { useSimulatorState } from "../state/simulator-state.js";
import { selectTimeseriesPlotData } from "./timeseries-plot-data.js";

defineSlots<{
	default(slotProps: { rows: SimRow[]; variableIds: string[] }): unknown;
}>();

const { simulation, selectedVariableIds } = useSimulatorState();

const plotData = computed(() =>
	selectTimeseriesPlotData(simulation.value, selectedVariableIds.value),
);

const hasVariablesToPlot = computed(
	() => plotData.value.variableIds.length > 0,
);
</script>

<template>
	<div class="flex flex-col bg-white border-t border-stone-200">
		<div
			v-if="!hasVariablesToPlot"
			class="flex-1 flex items-center justify-center text-stone-400 text-sm"
		>
			Select variables on the canvas to plot their timeseries
		</div>
		<slot v-else :rows="plotData.rows" :variable-ids="plotData.variableIds" />
	</div>
</template>
