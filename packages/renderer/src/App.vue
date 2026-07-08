<script setup lang="ts">
import type {
	ConnectionRoutingEdit,
	ElementPositionEdit,
	IR,
} from "@sysdml/contracts";
import { ref, onMounted, onUnmounted } from "vue";

import SysdmlDiagram from "./SysdmlDiagram.vue";
import { createTransport } from "./transport/index.js";
import type { IRTransport } from "./transport/types.js";

const ir = ref<IR | null>(null);
const errorMessage = ref<string | null>(null);

let transport: IRTransport | null = null;

onMounted(() => {
	transport = createTransport();
	transport.onIR((incoming) => {
		ir.value = incoming;
		errorMessage.value = null;
	});
	transport.onError((message) => {
		errorMessage.value = message;
	});
	transport.start();
});

onUnmounted(() => {
	transport?.stop();
	transport = null;
});

function onRoutingEdit(edit: ConnectionRoutingEdit): void {
	transport?.sendRoutingEdit(edit);
}

function onPositionEdit(edits: ElementPositionEdit[]): void {
	transport?.sendPositionEdits(edits);
}

function onPinMissingPositions(): void {
	transport?.sendPinMissingPositions();
}
</script>

<template>
	<div class="w-screen h-screen">
		<SysdmlDiagram
			:ir="ir"
			:error-message="errorMessage"
			@routing-edit="onRoutingEdit"
			@position-edit="onPositionEdit"
			@pin-missing-positions="onPinMissingPositions"
		/>
	</div>
</template>
