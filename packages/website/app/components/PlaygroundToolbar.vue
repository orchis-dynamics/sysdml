<script setup lang="ts">
import { ref, watch } from "vue";

import { exampleModels, getDefaultExample } from "../lib/examples";

const emit = defineEmits<{
	select: [source: string];
	upload: [source: string];
	share: [];
}>();

const selectedName = ref(getDefaultExample().name);
const fileInput = ref<HTMLInputElement | null>(null);

watch(selectedName, (name) => {
	const model = exampleModels.find((entry) => entry.name === name);
	if (model) emit("select", model.source);
});

function onUploadClick(): void {
	fileInput.value?.click();
}

function onFileChange(event: Event): void {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const file = input.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.addEventListener("load", () => {
		if (typeof reader.result === "string") {
			emit("upload", reader.result);
		}
	});
	reader.readAsText(file);
	input.value = "";
}
</script>

<template>
	<div
		class="flex items-center gap-2 px-3 py-2 border-b border-stone-200 bg-white"
	>
		<label class="text-xs font-mono text-stone-500">example</label>
		<select
			v-model="selectedName"
			class="text-xs font-mono border border-stone-300 rounded px-2 py-1"
		>
			<option
				v-for="model in exampleModels"
				:key="model.name"
				:value="model.name"
			>
				{{ model.label }}
			</option>
		</select>
		<button
			type="button"
			class="text-xs font-mono border border-stone-300 rounded px-2 py-1"
			@click="onUploadClick"
		>
			Upload .sysdml
		</button>
		<button
			type="button"
			class="text-xs font-mono border border-stone-300 rounded px-2 py-1"
			@click="emit('share')"
		>
			Share
		</button>
		<input
			ref="fileInput"
			type="file"
			accept=".sysdml"
			class="hidden"
			@change="onFileChange"
		/>
	</div>
</template>
