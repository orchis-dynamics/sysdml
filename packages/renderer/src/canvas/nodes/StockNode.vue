<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div
    class="border border-stone-700 bg-white min-w-[100px] px-3 py-1.5 text-sm font-medium text-stone-800 text-center select-none cursor-grab active:cursor-grabbing"
  >
    {{ label }}
  </div>
</template>
