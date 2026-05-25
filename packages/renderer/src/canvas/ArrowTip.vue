<script setup lang="ts">
import { HTMLAttributes } from "vue";

defineProps<{ id: HTMLAttributes["id"] }>();
</script>

<template>
  <marker :id markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
  </marker>
</template>
