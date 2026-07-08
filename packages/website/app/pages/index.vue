<script setup lang="ts">
import Playground from "../components/Playground.vue";
</script>

<template>
	<ClientOnly>
		<Playground />
		<template #fallback>
			<main class="w-screen h-screen flex items-center justify-center">
				<p class="font-mono text-sm text-stone-500">Loading playground…</p>
			</main>
		</template>
	</ClientOnly>
</template>
