<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import type { IR } from "@sysdml/ir";
import { computeLayout } from "./layout-engine.js";
import type { LayoutNode, LayoutEdge } from "./layout-engine.js";
import StockNode from "./nodes/StockNode.vue";
import AuxNode from "./nodes/AuxNode.vue";
import FlowNode from "./nodes/FlowNode.vue";

const props = defineProps<{ ir: IR | null }>();

const layout = computed(() => (props.ir ? computeLayout(props.ir) : { nodes: [], edges: [] }));

const dragOffsets = ref(new Map<string, { x: number; y: number }>());

function resolvedNode(node: LayoutNode): LayoutNode {
  const override = dragOffsets.value.get(node.id);
  return override ? { ...node, x: node.x + override.x, y: node.y + override.y } : node;
}

const resolvedNodes = computed(() => layout.value.nodes.map(resolvedNode));

watch(() => props.ir, () => {
  dragOffsets.value = new Map();
});

const translateX = ref(0);
const translateY = ref(0);
const scale = ref(1);

const transform = computed(
  () => `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
);

let isPanning = false;
let panStartX = 0;
let panStartY = 0;

function onMouseDown(event: MouseEvent) {
  if (event.button === 1) {
    event.preventDefault();
    isPanning = true;
    panStartX = event.clientX - translateX.value;
    panStartY = event.clientY - translateY.value;
  }
}

function onMouseMove(event: MouseEvent) {
  if (!isPanning) return;
  translateX.value = event.clientX - panStartX;
  translateY.value = event.clientY - panStartY;
}

function onMouseUp() {
  isPanning = false;
}

function onWheel(event: WheelEvent) {
  event.preventDefault();
  const container = containerRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const cursorX = event.clientX - rect.left;
  const cursorY = event.clientY - rect.top;

  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  const nextScale = Math.min(10, Math.max(0.1, scale.value * delta));

  // zoom around cursor position
  translateX.value = cursorX - (cursorX - translateX.value) * (nextScale / scale.value);
  translateY.value = cursorY - (cursorY - translateY.value) * (nextScale / scale.value);
  scale.value = nextScale;
}

let draggingId: string | null = null;
let dragBaseX = 0;
let dragBaseY = 0;
let dragPointerStartX = 0;
let dragPointerStartY = 0;

function onNodePointerDown(event: PointerEvent, node: LayoutNode) {
  event.stopPropagation();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  draggingId = node.id;
  const existing = dragOffsets.value.get(node.id) ?? { x: 0, y: 0 };
  dragBaseX = existing.x;
  dragBaseY = existing.y;
  dragPointerStartX = event.clientX;
  dragPointerStartY = event.clientY;
}

function onNodePointerMove(event: PointerEvent) {
  if (draggingId === null) return;
  const dx = (event.clientX - dragPointerStartX) / scale.value;
  const dy = (event.clientY - dragPointerStartY) / scale.value;
  dragOffsets.value = new Map(dragOffsets.value).set(draggingId, {
    x: dragBaseX + dx,
    y: dragBaseY + dy,
  });
}

function onNodePointerUp() {
  draggingId = null;
}

const containerRef = ref<HTMLDivElement | null>(null);

function nodeCenter(id: string): { x: number; y: number } {
  const node = resolvedNodes.value.find((n) => n.id === id);
  if (!node) return { x: 0, y: 0 };
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function edgePath(edge: LayoutEdge): string {
  const src = nodeCenter(edge.source);
  const tgt = nodeCenter(edge.target);
  if (edge.kind === "flow") {
    return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
  }
  const mx = (src.x + tgt.x) / 2;
  const my = (src.y + tgt.y) / 2 - 60;
  return `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`;
}

function edgeStroke(edge: LayoutEdge): string {
  if (edge.kind === "flow") return "#57534e"; // stone-600
  if (edge.polarity === "+") return "#059669"; // emerald-600
  if (edge.polarity === "-") return "#ef4444"; // red-500
  return "#a8a29e"; // stone-400
}

function edgeMarker(edge: LayoutEdge): string | undefined {
  if (edge.kind !== "connection") return undefined;
  if (edge.polarity === "+") return "url(#arrow-positive)";
  if (edge.polarity === "-") return "url(#arrow-negative)";
  return "url(#arrow-neutral)";
}

const svgWidth = ref(800);
const svgHeight = ref(600);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  resizeObserver = new ResizeObserver(([entry]) => {
    svgWidth.value = entry.contentRect.width;
    svgHeight.value = entry.contentRect.height;
  });
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full overflow-hidden bg-stone-50 cursor-default"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @wheel.prevent="onWheel"
  >
    <div
      class="absolute inset-0 origin-top-left"
      :style="{ transform }"
      @pointermove="onNodePointerMove"
      @pointerup="onNodePointerUp"
    >
      <svg
        class="absolute inset-0 pointer-events-none overflow-visible"
        :width="svgWidth"
        :height="svgHeight"
      >
        <defs>
          <marker id="arrow-positive" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#059669" />
          </marker>
          <marker id="arrow-negative" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
          </marker>
          <marker id="arrow-neutral" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#a8a29e" />
          </marker>
        </defs>
        <path
          v-for="edge in layout.edges"
          :key="edge.id"
          :d="edgePath(edge)"
          :stroke="edgeStroke(edge)"
          stroke-width="1"
          fill="none"
          :marker-end="edgeMarker(edge)"
        />
      </svg>

      <div
        v-for="node in resolvedNodes"
        :key="node.id"
        class="absolute"
        :style="{ left: `${node.x}px`, top: `${node.y}px` }"
        @pointerdown="onNodePointerDown($event, node)"
      >
        <StockNode v-if="node.kind === 'stock'" :label="node.id" />
        <AuxNode v-else-if="node.kind === 'aux'" :label="node.id" />
        <FlowNode v-else :label="node.id" />
      </div>
    </div>

    <div
      v-if="!ir"
      class="absolute inset-0 flex items-center justify-center text-stone-400 text-sm"
    >
      No model loaded
    </div>
  </div>
</template>
