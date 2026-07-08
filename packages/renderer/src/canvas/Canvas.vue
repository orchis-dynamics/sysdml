<script setup lang="ts">
import type {
	ConnectionRoutingEdit,
	ElementPositionEdit,
	IRPosition,
} from "@sysdml/contracts";
import {
	computeLayout,
	computeMissingPositions,
	isCausalLoopDiagram,
	type LayoutNode,
	type LayoutEdge,
	type LayoutConnectionEdge,
	type LayoutFlowEdge,
	type NodeKind,
} from "@sysdml/layout";
import { useResizeObserver } from "@vueuse/core";
import { ref, computed, watch, type Component } from "vue";

import { useModelState } from "../state/model-state.js";
import { useSimulatorState } from "../state/simulator-state.js";
import ArrowTip from "./ArrowTip.vue";
import { useConnectionRoutingDrag } from "./composables/connection-routing-drag.js";
import { useNodeDrag } from "./composables/node-drag.js";
import { usePanZoom } from "./composables/pan-zoom.js";
import {
	arcFromChordAndCentralAngle,
	clipToBox,
	connectionControlPoint,
	flowElbowCorner,
	flowPipeGeometry,
	orthogonalPipePoints,
	routeConnection,
	segmentConvexNormalAt,
	segmentPointAt,
	type Point,
	type RoutedConnection,
} from "./edge-geometry.js";
import AuxNode from "./nodes/AuxNode.vue";
import FlowNode from "./nodes/FlowNode.vue";
import StockNode from "./nodes/StockNode.vue";

const { ir } = useModelState();
const { isVariableSelected, toggleVariable } = useSimulatorState();

const layout = computed(() =>
	ir.value ? computeLayout(ir.value) : { nodes: [], edges: [] },
);

const SFD_CONNECTION_BULGE_SIGN = 1;
const CLD_CONNECTION_BULGE_SIGN = -1;

const connectionBulgeSign = computed(() =>
	ir.value && isCausalLoopDiagram(ir.value)
		? CLD_CONNECTION_BULGE_SIGN
		: SFD_CONNECTION_BULGE_SIGN,
);

const containerRef = ref<HTMLDivElement | null>(null);

const { transform, scale, onPointerDown, onPointerMove, onPointerUp, onWheel } =
	usePanZoom(containerRef);

const emit = defineEmits<{
	routingEdit: [edit: ConnectionRoutingEdit];
	positionEdit: [edits: ElementPositionEdit[]];
	pinMissingPositions: [];
}>();

const {
	hasMovedPastClickThreshold,
	resolveNode,
	onNodePointerDown,
	onNodePointerMove,
	onNodePointerUp,
	reset: resetDragOffsets,
} = useNodeDrag({
	scale,
	onCommit: (edits) =>
		emit(
			"positionEdit",
			edits.map((edit) => ({
				id: edit.id,
				position: { x: edit.position.x, y: edit.position.y },
			})),
		),
});

const {
	hoveredEdgeId,
	draggingEdgeId,
	previewFor,
	onEdgePointerEnter,
	onEdgePointerLeave,
	onDotPointerDown,
	onDotPointerMove,
	onDotPointerUp,
	clearPreviews,
} = useConnectionRoutingDrag({
	scale,
	onCommit: (edit) => emit("routingEdit", edit),
});

const ROUTING_HIT_STROKE_SCREEN_PX = 12;
const ROUTING_DOT_RADIUS_SCREEN_PX = 4;

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

watch(ir, () => {
	resetDragOffsets();
	clearPreviews();
});

let lastPinSignature: string | null = null;

watch(
	ir,
	(currentIr) => {
		if (!currentIr) return;
		const missing = computeMissingPositions(currentIr);
		if (missing.length === 0) return;
		const signature = missing
			.map((entry) => entry.id)
			.sort()
			.join("\n");
		if (signature === lastPinSignature) return;
		lastPinSignature = signature;
		emit("pinMissingPositions");
	},
	{ immediate: true },
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

function connectionHints(edge: LayoutConnectionEdge): {
	angle?: number;
	via?: IRPosition;
} {
	const preview = previewFor(edge.id);
	return {
		angle: preview?.angle ?? edge.angle,
		via: preview?.via ?? edge.via,
	};
}

function routedConnectionFor(
	edge: LayoutConnectionEdge,
): RoutedConnection | null {
	const hints = connectionHints(edge);
	if (hints.angle === undefined && hints.via === undefined) return null;
	return routeConnection(
		nodeCenter(edge.source),
		nodeCenter(edge.target),
		targetBox(edge.target),
		hints,
	);
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
	const controlPoint = connectionControlPoint(
		source,
		targetCenter,
		connectionBulgeSign.value,
	);
	const end = box ? clipToBox(controlPoint, targetCenter, box) : targetCenter;
	return { source, controlPoint, corner: null, end };
}

interface RoutingDot {
	edge: LayoutConnectionEdge;
	x: number;
	y: number;
}

function dotPosition(edge: LayoutConnectionEdge): Point {
	const hints = connectionHints(edge);
	const source = nodeCenter(edge.source);
	const target = nodeCenter(edge.target);
	if (hints.via !== undefined) return hints.via;
	if (hints.angle !== undefined) {
		return segmentPointAt(
			arcFromChordAndCentralAngle(source, target, hints.angle),
			0.5,
		);
	}
	const { controlPoint, end } = edgeEndpoints(edge);
	if (controlPoint === null) {
		return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
	}
	return quadraticPoint(source, controlPoint, end, 0.5);
}

const routingDots = computed<RoutingDot[]>(() => {
	const dots: RoutingDot[] = [];
	for (const edge of layout.value.edges) {
		if (edge.kind !== "connection") continue;
		if (hoveredEdgeId.value !== edge.id && draggingEdgeId.value !== edge.id) {
			continue;
		}
		const { x, y } = dotPosition(edge);
		dots.push({ edge, x, y });
	}
	return dots;
});

function onRoutingDotPointerDown(event: PointerEvent, dot: RoutingDot): void {
	onDotPointerDown(
		event,
		{
			id: dot.edge.id,
			from: dot.edge.source,
			polarity: dot.edge.polarity,
			to: dot.edge.target,
			occurrence: dot.edge.occurrence,
			hasVia: dot.edge.via !== undefined,
			hasAngle: dot.edge.angle !== undefined,
		},
		{
			source: nodeCenter(dot.edge.source),
			target: nodeCenter(dot.edge.target),
			dotStart: { x: dot.x, y: dot.y },
		},
	);
}

function onCanvasPointerMove(event: PointerEvent): void {
	onNodePointerMove(event);
	onDotPointerMove(event);
}

function onCanvasPointerUp(): void {
	onNodePointerUp();
	onDotPointerUp();
}

function getEdgePath(edge: LayoutEdge): string {
	if (edge.kind === "connection") {
		const routedConnection = routedConnectionFor(edge);
		if (routedConnection) return routedConnection.path;
	}
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
		const routedConnection = routedConnectionFor(edge);
		if (routedConnection) {
			const finalSegment =
				routedConnection.segments[routedConnection.segments.length - 1];
			const anchor = segmentPointAt(finalSegment, LABEL_PARAM);
			const normal = segmentConvexNormalAt(finalSegment, LABEL_PARAM);
			labels.push({
				id: edge.id,
				x: anchor.x + normal.x * LABEL_OFFSET,
				y: anchor.y + normal.y * LABEL_OFFSET,
				text: edge.polarity === "+" ? "+" : "−",
				color: edge.polarity === "+" ? "#059669" : "#ef4444",
			});
			continue;
		}
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

function flowEdgeGeometry(edge: LayoutFlowEdge): FlowEdgeGeometry {
	const source = nodeCenter(edge.source);
	const targetCenter = nodeCenter(edge.target);
	const box = targetBox(edge.target);
	const unclippedPoints = orthogonalPipePoints(
		source,
		edge.via ?? [],
		targetCenter,
	);
	const beforeEnd = unclippedPoints[unclippedPoints.length - 2] ?? source;
	const end = box ? clipToBox(beforeEnd, targetCenter, box) : targetCenter;
	const pipePoints = [...unclippedPoints.slice(0, -1), end];
	return flowPipeGeometry(
		pipePoints,
		FLOW_ARROWHEAD_LENGTH,
		FLOW_ARROWHEAD_HALF_WIDTH,
	);
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
			connectionEdge: LayoutConnectionEdge | null;
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
			connectionEdge: edge.kind === "connection" ? edge : null,
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
		@pointercancel="onPointerUp"
		@wheel.prevent="onWheel"
	>
		<div
			class="absolute inset-0 origin-top-left font-mono"
			:style="{ transform }"
			@pointermove="onCanvasPointerMove"
			@pointerup="onCanvasPointerUp"
			@pointercancel="onCanvasPointerUp"
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
						:key="kind"
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
					<path
						v-if="item.kind === 'other' && item.connectionEdge"
						:d="item.path"
						stroke="transparent"
						:stroke-width="ROUTING_HIT_STROKE_SCREEN_PX / scale"
						fill="none"
						style="pointer-events: stroke"
						@pointerenter="onEdgePointerEnter(item.connectionEdge.id)"
						@pointerleave="onEdgePointerLeave(item.connectionEdge.id)"
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
				<circle
					v-for="dot in routingDots"
					:key="`routing-dot-${dot.edge.id}`"
					:cx="dot.x"
					:cy="dot.y"
					:r="ROUTING_DOT_RADIUS_SCREEN_PX / scale"
					class="fill-sky-500"
					style="pointer-events: all; cursor: grab"
					@pointerenter="onEdgePointerEnter(dot.edge.id)"
					@pointerleave="onEdgePointerLeave(dot.edge.id)"
					@pointerdown="onRoutingDotPointerDown($event, dot)"
				/>
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
