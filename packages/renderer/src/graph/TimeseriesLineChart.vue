<script setup lang="ts">
import type { SimRow } from "@sysdml/simulator";
import { VisAxis, VisLine, VisXYContainer } from "@unovis/vue";
import { computed } from "vue";

const props = defineProps<{
	rows: SimRow[];
	variableIds: string[];
}>();

const LINE_COLOR_PALETTE = [
	"#0ea5e9",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#14b8a6",
	"#f97316",
];

function colorForVariableIndex(index: number): string {
	return LINE_COLOR_PALETTE[index % LINE_COLOR_PALETTE.length];
}

const timeAccessor = (row: SimRow): number => row.time;

interface LineSeriesBinding {
	variableId: string;
	color: string;
	valueAccessor: (row: SimRow) => number;
}

const lineSeriesBindings = computed<LineSeriesBinding[]>(() =>
	props.variableIds.map((variableId, index) => ({
		variableId,
		color: colorForVariableIndex(index),
		valueAccessor: (row: SimRow): number => row[variableId] ?? 0,
	})),
);
</script>

<template>
	<div class="flex h-full min-h-0 flex-col gap-2 p-3">
		<div class="flex flex-wrap gap-3 text-xs font-mono text-stone-600">
			<span
				v-for="binding in lineSeriesBindings"
				:key="binding.variableId"
				class="inline-flex items-center gap-1.5"
			>
				<span
					aria-hidden="true"
					class="inline-block h-2 w-2 rounded-full"
					:style="{ backgroundColor: binding.color }"
				/>
				{{ binding.variableId }}
			</span>
		</div>
		<VisXYContainer :data="rows" class="flex-1 min-h-0">
			<VisLine
				v-for="binding in lineSeriesBindings"
				:key="binding.variableId"
				:x="timeAccessor"
				:y="binding.valueAccessor"
				:color="binding.color"
			/>
			<VisAxis type="x" label="Time" />
			<VisAxis type="y" />
		</VisXYContainer>
	</div>
</template>
