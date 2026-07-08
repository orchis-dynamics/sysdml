<script setup lang="ts">
import * as monacoApi from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { onBeforeUnmount, onMounted, ref } from "vue";

import {
	registerSysdmlLanguage,
	SYSDML_LANGUAGE_ID,
} from "../lib/monaco/sysdml-language";
import { PLAYGROUND_URI } from "../lib/playground-mediator";

const props = defineProps<{ initialSource: string }>();
const emit = defineEmits<{
	ready: [
		model: monacoApi.editor.ITextModel,
		monacoApi: typeof import("monaco-editor"),
	];
}>();

const container = ref<HTMLElement | null>(null);
let editor: monacoApi.editor.IStandaloneCodeEditor | null = null;

function resolveModel(): monacoApi.editor.ITextModel {
	const uri = monacoApi.Uri.parse(PLAYGROUND_URI);
	const existing = monacoApi.editor.getModel(uri);
	if (existing) {
		existing.setValue(props.initialSource);
		return existing;
	}
	return monacoApi.editor.createModel(
		props.initialSource,
		SYSDML_LANGUAGE_ID,
		uri,
	);
}

onMounted(() => {
	self.MonacoEnvironment = {
		getWorker: () => new EditorWorker(),
	};
	registerSysdmlLanguage(monacoApi);

	const host = container.value;
	if (!host) return;

	const model = resolveModel();
	editor = monacoApi.editor.create(host, {
		model,
		automaticLayout: true,
		minimap: { enabled: false },
		fontFamily: "var(--font-mono, monospace)",
		fontSize: 13,
		scrollBeyondLastLine: false,
	});

	emit("ready", model, monacoApi);
});

onBeforeUnmount(() => {
	editor?.dispose();
	editor = null;
});
</script>

<template>
	<div ref="container" class="w-full h-full" />
</template>
