<script setup lang="ts">
import type { IR } from "@sysdml/ir";
import { useResizeObserver } from "@vueuse/core";
import { ref, computed, watch, type Component } from "vue";

import { useSimulatorState } from "../state/simulator-state.js";
import ArrowTip from "./ArrowTip.vue";
import { useNodeDrag } from "./composables/node-drag.js";
import { usePanZoom } from "./composables/pan-zoom.js";
import {
	clipToBox,
	connectionControlPoint,
	flowElbowCorner,
	type Point,
} from "./edge-geometry.js";
import { computeLayout } from "./layout-engine.js";
import type { LayoutNode, LayoutEdge, NodeKind } from "./layout-types.js";
import AuxNode from "./nodes/AuxNode.vue";
import FlowNode from "./nodes/FlowNode.vue";
import StockNode from "./nodes/StockNode.vue";

const props = defineProps<{ ir: IR | null }>();

const { isVariableSelected, toggleVariable } = useSimulatorState();

const layout = computed(() =>
	props.ir ? computeLayout(props.ir) : { nodes: [], edges: [] },
);

const containerRef = ref<HTMLDivElement | null>(null);

const { transform, scale, onPointerDown, onPointerMove, onPointerUp, onWheel } =
	usePanZoom(containerRef);

const {
	hasMovedPastClickThreshold,
	resolveNode,
	onNodePointerDown,
	onNodePointerMove,
	onNodePointerUp,
	reset: resetDragOffsets,
} = useNodeDrag({ scale });

enum VisualEdgeKindEnum {
	Default = "default",
	Flow = "flow",
	Positive = "positive",
	Negative = "negative",
}
type VisualEdgeKind = `${VisualEdgeKindEnum}`;

const colorTheme: {
	edge: {
		stroke: Record<VisualEdgeKind, string>;
		fill: Record<VisualEdgeKind, string>;
	};
} = {
	edge: {
		stroke: {
			[VisualEdgeKindEnum.Positive]: "stroke-emerald-600",
			[VisualEdgeKindEnum.Negative]: "stroke-red-600",
			[VisualEdgeKindEnum.Flow]: "stroke-stone-600",
			[VisualEdgeKindEnum.Default]: "stroke-black",
		},
		fill: {
			[VisualEdgeKindEnum.Positive]: "fill-emerald-600",
			[VisualEdgeKindEnum.Negative]: "fill-red-600",
			[VisualEdgeKindEnum.Flow]: "fill-stone-600",
			[VisualEdgeKindEnum.Default]: "fill-black",
		},
	},
};

const FLOW_PIPE_OUTER_STROKE_WIDTH = 6;
const FLOW_PIPE_INNER_STROKE_WIDTH = 4;
const FLOW_ARROWHEAD_LENGTH = 10;
const FLOW_ARROWHEAD_HALF_WIDTH = 6;

const nodeComponentMap: Record<NodeKind, Component> = {
	aux: AuxNode,
	flow: FlowNode,
	stock: StockNode,
};

const resolvedNodes = computed(() => layout.value.nodes.map(resolveNode));

watch(
	() => props.ir,
	() => {
		resetDragOffsets();
	},
);

function onNodeClick(node: LayoutNode) {
	if (hasMovedPastClickThreshold.value) return;
	toggleVariable(node.id);
}

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
	source: Point;
	controlPoint: Point | null;
	corner: Point | null;
	end: Point;
} {
	const source = nodeCenter(edge.source);
	const targetCenter = nodeCenter(edge.target);
	const box = targetBox(edge.target);
	if (edge.kind === "flow") {
		const corner = flowElbowCorner(source, targetCenter);
		const segmentStart = corner ?? source;
		const end = box ? clipToBox(segmentStart, targetCenter, box) : targetCenter;
		return { source, controlPoint: null, corner, end };
	}
	const controlPoint = connectionControlPoint(source, targetCenter);
	const end = box ? clipToBox(controlPoint, targetCenter, box) : targetCenter;
	return { source, controlPoint, corner: null, end };
}

function getEdgePath(edge: LayoutEdge): string {
	const { source, controlPoint, corner, end } = edgeEndpoints(edge);
	if (controlPoint !== null) {
		return `M ${source.x} ${source.y} Q ${controlPoint.x} ${controlPoint.y} ${end.x} ${end.y}`;
	}
	if (corner !== null) {
		return `M ${source.x} ${source.y} L ${corner.x} ${corner.y} L ${end.x} ${end.y}`;
	}
	return `M ${source.x} ${source.y} L ${end.x} ${end.y}`;
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
		const { source, controlPoint, end } = edgeEndpoints(edge);
		if (controlPoint === null) continue;
		const point = quadraticPoint(source, controlPoint, end, LABEL_PARAM);
		const tangent = quadraticTangent(source, controlPoint, end, LABEL_PARAM);
		const length = Math.hypot(tangent.x, tangent.y) || 1;
		let perpX = -tangent.y / length;
		let perpY = tangent.x / length;
		// Place label on the convex (control-point) side of the curve.
		if (
			perpX * (controlPoint.x - point.x) + perpY * (controlPoint.y - point.y) <
			0
		) {
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

function getEdgeStrokeClass(edge: LayoutEdge): string {
	return colorTheme.edge.stroke[getEdgeType(edge)];
}

function getEdgeFillClass(edge: LayoutEdge): string {
	return colorTheme.edge.fill[getEdgeType(edge)];
}

interface FlowEdgeGeometry {
	pipePath: string;
	arrowheadPoints: string;
}

function flowEdgeGeometry(edge: LayoutEdge): FlowEdgeGeometry {
	const { source, corner, end } = edgeEndpoints(edge);
	const previousPoint = corner ?? source;
	const deltaX = end.x - previousPoint.x;
	const deltaY = end.y - previousPoint.y;
	const segmentLength = Math.hypot(deltaX, deltaY) || 1;
	const directionX = deltaX / segmentLength;
	const directionY = deltaY / segmentLength;
	const pipeEndX = end.x - directionX * FLOW_ARROWHEAD_LENGTH;
	const pipeEndY = end.y - directionY * FLOW_ARROWHEAD_LENGTH;
	const pipePath = corner
		? `M ${source.x} ${source.y} L ${corner.x} ${corner.y} L ${pipeEndX} ${pipeEndY}`
		: `M ${source.x} ${source.y} L ${pipeEndX} ${pipeEndY}`;
	const perpendicularX = -directionY;
	const perpendicularY = directionX;
	const baseLeftX = pipeEndX + perpendicularX * FLOW_ARROWHEAD_HALF_WIDTH;
	const baseLeftY = pipeEndY + perpendicularY * FLOW_ARROWHEAD_HALF_WIDTH;
	const baseRightX = pipeEndX - perpendicularX * FLOW_ARROWHEAD_HALF_WIDTH;
	const baseRightY = pipeEndY - perpendicularY * FLOW_ARROWHEAD_HALF_WIDTH;
	return {
		pipePath,
		arrowheadPoints: `${end.x},${end.y} ${baseLeftX},${baseLeftY} ${baseRightX},${baseRightY}`,
	};
}

type EdgeRenderItem =
	| {
			kind: "flow";
			id: string;
			pipePath: string;
			arrowheadPoints: string;
			strokeClass: string;
			fillClass: string;
	  }
	| {
			kind: "other";
			id: string;
			path: string;
			strokeClass: string;
			markerId: string;
	  };

const edgeRenderItems = computed<EdgeRenderItem[]>(() =>
	layout.value.edges.map((edge) => {
		if (edge.kind === "flow") {
			const { pipePath, arrowheadPoints } = flowEdgeGeometry(edge);
			return {
				kind: "flow",
				id: edge.id,
				pipePath,
				arrowheadPoints,
				strokeClass: getEdgeStrokeClass(edge),
				fillClass: getEdgeFillClass(edge),
			};
		}
		return {
			kind: "other",
			id: edge.id,
			path: getEdgePath(edge),
			strokeClass: getEdgeStrokeClass(edge),
			markerId: getEdgeArrowTipId(edge),
		};
	}),
);

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

useResizeObserver(containerRef, ([entry]) => {
	svgWidth.value = entry.contentRect.width;
	svgHeight.value = entry.contentRect.height;
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
				<template v-for="item in edgeRenderItems" :key="item.id">
					<template v-if="item.kind === 'flow'">
						<path
							:class="item.strokeClass"
							:d="item.pipePath"
							:stroke-width="FLOW_PIPE_OUTER_STROKE_WIDTH"
							fill="none"
						/>
						<path
							class="stroke-stone-50"
							:d="item.pipePath"
							:stroke-width="FLOW_PIPE_INNER_STROKE_WIDTH"
							fill="none"
						/>
						<polygon :class="item.fillClass" :points="item.arrowheadPoints" />
					</template>
					<path
						v-else
						:class="item.strokeClass"
						:d="item.path"
						stroke-width="1"
						fill="none"
						:marker-end="`url(#${item.markerId})`"
					/>
				</template>
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
				class="absolute rounded-md"
				:class="{
					'ring-2 ring-sky-500 ring-offset-2 ring-offset-stone-50':
						isVariableSelected(node.id),
				}"
				:style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }"
				@pointerdown="onNodePointerDown($event, node)"
				@click="onNodeClick(node)"
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
