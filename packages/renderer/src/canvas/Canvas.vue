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

type Point = { x: number; y: number };
const CONNECTION_BULGE = 60;
const LABEL_OFFSET = 12;
const LABEL_PARAM = 0.85;

function nodeCenter(id: string): Point {
  const node = resolvedNodes.value.find((n) => n.id === id);
  if (!node) return { x: 0, y: 0 };
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function targetBox(id: string): LayoutNode | null {
  return resolvedNodes.value.find((n) => n.id === id) ?? null;
}

// Walks from p0 toward p1 and returns the point where the segment first enters
// the axis-aligned box. Assumes p1 is inside (or on) the box; if p0 is also
// inside, returns p0 unchanged.
function clipToBox(p0: Point, p1: Point, box: LayoutNode): Point {
  const minX = box.x;
  const maxX = box.x + box.width;
  const minY = box.y;
  const maxY = box.y + box.height;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;

  const tEnterX = dx === 0 ? -Infinity : ((dx > 0 ? minX : maxX) - p0.x) / dx;
  const tEnterY = dy === 0 ? -Infinity : ((dy > 0 ? minY : maxY) - p0.y) / dy;
  const tEnter = Math.max(tEnterX, tEnterY);
  const t = Math.min(1, Math.max(0, tEnter));
  return { x: p0.x + t * dx, y: p0.y + t * dy };
}

function connectionControlPoint(src: Point, tgt: Point): Point {
  return { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 - CONNECTION_BULGE };
}

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}

function quadraticTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

function edgeEndpoints(edge: LayoutEdge): { src: Point; ctrl: Point | null; end: Point } {
  const src = nodeCenter(edge.source);
  const tgtCenter = nodeCenter(edge.target);
  const box = targetBox(edge.target);
  if (edge.kind === "flow") {
    const end = box ? clipToBox(src, tgtCenter, box) : tgtCenter;
    return { src, ctrl: null, end };
  }
  const ctrl = connectionControlPoint(src, tgtCenter);
  const end = box ? clipToBox(ctrl, tgtCenter, box) : tgtCenter;
  return { src, ctrl, end };
}

function edgePath(edge: LayoutEdge): string {
  const { src, ctrl, end } = edgeEndpoints(edge);
  if (ctrl === null) {
    return `M ${src.x} ${src.y} L ${end.x} ${end.y}`;
  }
  return `M ${src.x} ${src.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
}

interface PolarityLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const polarityLabels = computed<PolarityLabel[]>(() => {
  const labels: PolarityLabel[] = [];
  for (const edge of layout.value.edges) {
    if (edge.kind !== "connection") continue;
    if (edge.polarity !== "+" && edge.polarity !== "-") continue;
    const { src, ctrl, end } = edgeEndpoints(edge);
    if (ctrl === null) continue;
    const point = quadraticPoint(src, ctrl, end, LABEL_PARAM);
    const tangent = quadraticTangent(src, ctrl, end, LABEL_PARAM);
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    let perpX = -tangent.y / length;
    let perpY = tangent.x / length;
    // Place label on the convex (control-point) side of the curve.
    if (perpX * (ctrl.x - point.x) + perpY * (ctrl.y - point.y) < 0) {
      perpX = -perpX;
      perpY = -perpY;
    }
    labels.push({
      id: edge.id,
      x: point.x + perpX * LABEL_OFFSET,
      y: point.y + perpY * LABEL_OFFSET,
      text: edge.polarity === "+" ? "+" : "−",
      color: edge.polarity === "+" ? "#059669" : "#ef4444",
    });
  }
  return labels;
});

function edgeStroke(edge: LayoutEdge): string {
  if (edge.kind === "flow") return "#57534e"; // stone-600
  if (edge.polarity === "+") return "#059669"; // emerald-600
  if (edge.polarity === "-") return "#ef4444"; // red-500
  return "#a8a29e"; // stone-400
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
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="context-stroke" />
          </marker>
        </defs>
        <path
          v-for="edge in layout.edges"
          :key="edge.id"
          :d="edgePath(edge)"
          :stroke="edgeStroke(edge)"
          stroke-width="1"
          fill="none"
          marker-end="url(#arrow)"
        />
        <text
          v-for="label in polarityLabels"
          :key="`label-${label.id}`"
          :x="label.x"
          :y="label.y"
          :fill="label.color"
          font-size="14"
          font-weight="600"
          text-anchor="middle"
          dominant-baseline="middle"
          pointer-events="none"
        >{{ label.text }}</text>
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
