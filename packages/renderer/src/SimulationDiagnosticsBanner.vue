<script setup lang="ts">
import type { SimDiagnostic } from "@sysdml/contracts";

defineProps<{ diagnostics: SimDiagnostic[] }>();

const ERROR_BANNER_CLASS = "bg-red-50 border-red-200 text-red-700";
const WARNING_BANNER_CLASS = "bg-amber-50 border-amber-200 text-amber-700";

function bannerSeverityClass(diagnostic: SimDiagnostic): string {
	return diagnostic.code === "error"
		? ERROR_BANNER_CLASS
		: WARNING_BANNER_CLASS;
}
</script>

<template>
	<div
		v-for="(diagnostic, index) in diagnostics"
		:key="`${diagnostic.code}-${index}-${diagnostic.message}`"
		class="border-b text-xs font-mono px-4 py-2 shrink-0"
		:class="bannerSeverityClass(diagnostic)"
	>
		Simulation {{ diagnostic.code }}: {{ diagnostic.message }}
	</div>
</template>
