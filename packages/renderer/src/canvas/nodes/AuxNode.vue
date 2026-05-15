<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div
    class="border border-stone-700 bg-white w-[72px] h-[72px] rounded-full flex items-center justify-center text-xs font-medium text-stone-800 text-center select-none cursor-grab active:cursor-grabbing"
  >
    {{ label }}
  </div>
</template>
