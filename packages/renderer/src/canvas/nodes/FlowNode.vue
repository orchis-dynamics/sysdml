<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div
    class="border border-stone-500 bg-stone-100 w-[16px] h-[16px] select-none cursor-grab active:cursor-grabbing"
    :title="label"
  />
</template>
