<script setup lang="ts">
import { ref, useTemplateRef, watch } from "vue";

import IconFlowValve from "./Icon/IconFlowValve.vue";

const props = defineProps<{ label: string }>();

const cloud = useTemplateRef("cloud");

const labelOffset = ref(0);

const HALF_VALVE_WIDTH_PIXELS = 12;

function measureLabelOffset(): void {
	const labelElement = cloud.value?.firstElementChild;
	if (labelElement instanceof HTMLElement) {
		labelOffset.value = labelElement.clientWidth / 2 - HALF_VALVE_WIDTH_PIXELS;
	}
}

watch([cloud, () => props.label], measureLabelOffset, { flush: "post" });
</script>

<template>
	<div
		ref="cloud"
		class="relative w-[24px] h-[24px] select-none cursor-grab active:cursor-grabbing"
		:title="label"
	>
		<span
			class="absolute -bottom-8 text-sm"
			:style="{ left: `${-labelOffset}px` }"
		>
			{{ label }}
		</span>

		<IconFlowValve class="size-6" />
	</div>
</template>
