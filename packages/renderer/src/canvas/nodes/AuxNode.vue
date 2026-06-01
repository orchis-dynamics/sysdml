<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
	<div
		class="min-w-[72px] h-[24px] flex items-center bg-white justify-center text-xs font-medium text-stone-800 text-center select-none cursor-grab active:cursor-grabbing"
	>
		{{ label }}
	</div>
</template>
