<script setup lang="ts">
import type {
	ConnectionRoutingEdit,
	ElementPositionEdit,
	IR,
} from "@sysdml/contracts";
import { SysdmlDiagram } from "@sysdml/renderer/lib";
import type * as monaco from "monaco-editor";
import { onBeforeUnmount, ref, shallowRef } from "vue";

import MonacoPane from "./MonacoPane.vue";
import PlaygroundToolbar from "./PlaygroundToolbar.vue";
import { getDefaultExample } from "../lib/examples";
import { createLspClient } from "../lib/lsp/lsp-client";
import { spawnLspWorkerConnection } from "../lib/lsp/lsp-worker-connection";
import { registerSysdmlProviders } from "../lib/lsp/providers";
import {
	makeMediatorModel,
	makeMonacoBridge,
} from "../lib/monaco/editor-bridge";
import {
	createPlaygroundMediator,
	type Mediator,
} from "../lib/playground-mediator";
import { decodeSourceFromHash, encodeSourceToHash } from "../lib/share-url";

const TOAST_DURATION_MS = 4000;

const initialSource = shallowRef(getDefaultExample().source);
const ir = ref<IR | null>(null);
const errorMessage = ref<string | null>(null);
const toast = ref<string | null>(null);

let mediator: Mediator | null = null;
let editorModel: monaco.editor.ITextModel | null = null;
let providerDisposables: monaco.IDisposable[] = [];

const workerConnection = spawnLspWorkerConnection();
const client = createLspClient(workerConnection.connection);

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string): void {
	toast.value = message;
	if (toastTimer !== null) clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		toast.value = null;
		toastTimer = null;
	}, TOAST_DURATION_MS);
}

async function applyHashSource(): Promise<void> {
	const decoded = await decodeSourceFromHash(window.location.hash);
	if (decoded !== null && editorModel) {
		editorModel.setValue(decoded);
	}
}

async function onEditorReady(
	model: monaco.editor.ITextModel,
	monacoApi: typeof import("monaco-editor"),
): Promise<void> {
	editorModel = model;
	try {
		providerDisposables = registerSysdmlProviders(monacoApi, client);
		mediator = createPlaygroundMediator({
			client,
			model: makeMediatorModel(model),
			monacoApi: makeMonacoBridge(model, monacoApi),
			callbacks: {
				onIr: (incoming) => {
					ir.value = incoming;
				},
				onError: (message) => {
					errorMessage.value = message;
				},
				onToast: (message) => {
					showToast(message);
				},
			},
		});
		await mediator.start();
		await applyHashSource();
	} catch (error) {
		errorMessage.value = String(error);
	}
}

function onSelectExample(source: string): void {
	editorModel?.setValue(source);
}

function onUpload(source: string): void {
	editorModel?.setValue(source);
}

async function onShare(): Promise<void> {
	if (!editorModel) return;
	const hash = await encodeSourceToHash(editorModel.getValue());
	const url = `${window.location.origin}${window.location.pathname}#${hash}`;
	window.history.replaceState(null, "", `#${hash}`);
	try {
		await navigator.clipboard.writeText(url);
		showToast("Link copied to clipboard");
	} catch {
		showToast("Could not copy link");
	}
}

function onRoutingEdit(edit: ConnectionRoutingEdit): void {
	mediator?.handleRoutingEdit(edit);
}

function onPositionEdit(edits: ElementPositionEdit[]): void {
	mediator?.handlePositionEdits(edits);
}

function onPinMissingPositions(): void {
	mediator?.handlePinMissingPositions();
}

onBeforeUnmount(() => {
	if (toastTimer !== null) clearTimeout(toastTimer);
	mediator?.dispose();
	for (const disposable of providerDisposables) disposable.dispose();
	client.dispose();
	workerConnection.terminateWorker();
});
</script>

<template>
	<div class="w-screen h-screen flex flex-col relative">
		<PlaygroundToolbar
			@select="onSelectExample"
			@upload="onUpload"
			@share="onShare"
		/>
		<div class="flex-1 min-h-0 flex">
			<div class="w-1/2 h-full border-r border-stone-200">
				<MonacoPane :initial-source="initialSource" @ready="onEditorReady" />
			</div>
			<div class="w-1/2 h-full">
				<SysdmlDiagram
					:ir="ir"
					:error-message="errorMessage"
					@routing-edit="onRoutingEdit"
					@position-edit="onPositionEdit"
					@pin-missing-positions="onPinMissingPositions"
				/>
			</div>
		</div>
		<div
			v-if="toast"
			class="absolute bottom-4 right-4 bg-stone-900 text-white text-xs font-mono px-3 py-2 rounded shadow"
		>
			{{ toast }}
		</div>
	</div>
</template>
