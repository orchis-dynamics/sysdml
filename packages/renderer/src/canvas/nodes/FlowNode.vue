<script setup lang="ts">
import { ref, useTemplateRef, watch } from "vue";

import IconFlowValve from "./Icon/IconFlowValve.vue";

defineProps<{ label: string }>();

const cloud = useTemplateRef("cloud");

const labelOffset = ref(0);

watch(cloud, () => {
	if (typeof cloud.value?.firstElementChild?.clientWidth === "number")
		labelOffset.value = cloud.value?.firstElementChild?.clientWidth / 2 - 12;
});
</script>

<template>
	<div
		ref="cloud"
		class="relative w-[24px] h-[24px] select-none cursor-grab active:cursor-grabbing"
		:title="label"
	>
		<span
			class="absolute -bottom-8 text-sm"
			:style="{ left: `-${labelOffset}px` }"
		>
			{{ label }}
		</span>

		<IconFlowValve class="size-6" />
	</div>
</template>
