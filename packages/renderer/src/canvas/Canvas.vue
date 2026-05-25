<script setup lang="ts">
import type { IR } from "@sysdml/ir";
import {
	ref,
	computed,
	onMounted,
	onUnmounted,
	watch,
	type Component,
} from "vue";

import ArrowTip from "./ArrowTip.vue";
import { computeLayout } from "./layout-engine.js";
import {
	clipToBox,
	connectionControlPoint,
	flowElbowCorner,
	type Point,
} from "./edge-geometry.js";
import type { LayoutNode, LayoutEdge, NodeKind } from "./layout-types.js";
import AuxNode from "./nodes/AuxNode.vue";
import FlowNode from "./nodes/FlowNode.vue";
import StockNode from "./nodes/StockNode.vue";

const props = defineProps<{ ir: IR | null }>();

const layout = computed(() =>
	props.ir ? computeLayout(props.ir) : { nodes: [], edges: [] },
);

const dragOffsets = ref(new Map<string, { x: number; y: number }>());

enum VisualEdgeKindEnum {
	Default = "default",
	Flow = "flow",
	Positive = "positive",
	Negative = "negative",
}
type VisualEdgeKind = `${VisualEdgeKindEnum}`;

const colorTheme: { edge: Record<VisualEdgeKind, string> } = {
	edge: {
		[VisualEdgeKindEnum.Positive]: "stroke-emerald-600",
		[VisualEdgeKindEnum.Negative]: "stroke-red-600",
		[VisualEdgeKindEnum.Flow]: "stroke-stone-600",
		[VisualEdgeKindEnum.Default]: "stroke-black",
	},
};

const nodeComponentMap: Record<NodeKind, Component> = {
	aux: AuxNode,
	flow: FlowNode,
	stock: StockNode,
};

function resolvedNode(node: LayoutNode): LayoutNode {
	const override = dragOffsets.value.get(node.id);
	return override
		? {
				...node,
				position: {
					x: node.position.x + override.x,
					y: node.position.y + override.y,
				},
			}
		: node;
}

const resolvedNodes = computed(() => layout.value.nodes.map(resolvedNode));

watch(
	() => props.ir,
	() => {
		dragOffsets.value = new Map();
	},
);

const translateX = ref(0);
const translateY = ref(0);
const scale = ref(1);

const transform = computed(
	() =>
		`translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
);

let isPanning = false;
let panStartX = 0;
let panStartY = 0;

function onPointerDown(event: PointerEvent) {
	if (event.button === 0 || event.button === 1) {
		event.preventDefault();
		isPanning = true;
		panStartX = event.clientX - translateX.value;
		panStartY = event.clientY - translateY.value;
		containerRef.value?.setPointerCapture(event.pointerId);
	}
}

function onPointerMove(event: PointerEvent) {
	if (!isPanning) return;
	translateX.value = event.clientX - panStartX;
	translateY.value = event.clientY - panStartY;
}

function onPointerUp(event: PointerEvent) {
	isPanning = false;
	containerRef.value?.releasePointerCapture(event.pointerId);
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
	translateX.value =
		cursorX - (cursorX - translateX.value) * (nextScale / scale.value);
	translateY.value =
		cursorY - (cursorY - translateY.value) * (nextScale / scale.value);
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

const LABEL_OFFSET = 12;
const LABEL_PARAM = 0.85;

function nodeCenter(id: string): Point {
	const node = resolvedNodes.value.find((n) => n.id === id);
	if (!node) return { x: 0, y: 0 };
	return {
		x: node.position.x + node.size.width / 2,
		y: node.position.y + node.size.height / 2,
	};
}

function targetBox(id: string): LayoutNode | null {
	return resolvedNodes.value.find((n) => n.id === id) ?? null;
}

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
	const a = (1 - t) * (1 - t);
	const b = 2 * (1 - t) * t;
	const c = t * t;
	return {
		x: a * p0.x + b * p1.x + c * p2.x,
		y: a * p0.y + b * p1.y + c * p2.y,
	};
}

function quadraticTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
	return {
		x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
		y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
	};
}

function edgeEndpoints(edge: LayoutEdge): {
	src: Point;
	ctrl: Point | null;
	end: Point;
} {
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

function getEdgePath(edge: LayoutEdge): string {
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

function getEdgeType(edge: LayoutEdge): VisualEdgeKind {
	if (edge.kind === "flow") return "flow";
	if (edge.polarity === "+") return "positive";
	if (edge.polarity === "-") return "negative";

	return "default";
}

function getEdgeClassList(edge: LayoutEdge): string {
	return colorTheme.edge[getEdgeType(edge)];
}

const edgeArrowTipId: Record<VisualEdgeKind, string> = {
	positive: "arrow-tip-positive",
	negative: "arrow-tip-negative",
	flow: "arrow-tip-flow",
	default: "arrow-tip-default",
};

const edgeArrowTipClassList: Record<VisualEdgeKind, string> = {
	positive: "text-emerald-600",
	negative: "text-red-600",
	flow: "text-stone-600",
	default: "text-black",
};

function getEdgeArrowTipId(edge: LayoutEdge): string {
	return edgeArrowTipId[getEdgeType(edge)];
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
		@pointerdown="onPointerDown"
		@pointermove="onPointerMove"
		@pointerup="onPointerUp"
		@wheel.prevent="onWheel"
	>
		<div
			class="absolute inset-0 origin-top-left font-mono"
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
					<ArrowTip
						v-for="kind in VisualEdgeKindEnum"
						:id="edgeArrowTipId[kind]"
						:class="edgeArrowTipClassList[kind]"
					/>
				</defs>
				<path
					v-for="edge in layout.edges"
					:key="edge.id"
					:class="getEdgeClassList(edge)"
					:d="getEdgePath(edge)"
					stroke-width="1"
					fill="none"
					:marker-end="`url(#${getEdgeArrowTipId(edge)})`"
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
				>
					{{ label.text }}
				</text>
			</svg>

			<div
				v-for="node in resolvedNodes"
				:key="node.id"
				class="absolute"
				:style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
				@pointerdown="onNodePointerDown($event, node)"
				@click="() => console.log(node)"
			>
				<component :is="nodeComponentMap[node.kind]" :label="node.id" />
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
