import type { ConnectionRoutingEdit, IRPosition } from "@sysdml/contracts";
import {
	getCurrentInstance,
	onUnmounted,
	ref,
	shallowRef,
	type Ref,
} from "vue";

import {
	centralAngleDegreesFromDragPoint,
	clampDragAngleDegrees,
	viaDerivedCentralAngleDegrees,
	type Point,
} from "../edge-geometry.js";
import { capturePointerQuietly } from "./pointer-capture.js";

const ROUTING_DRAG_CLICK_THRESHOLD_PX = 4;
const PREVIEW_REVERT_TIMEOUT_MS = 2000;

export interface RoutingDragConnection {
	id: string;
	from: string;
	polarity: "+" | "-" | "=>";
	to: string;
	occurrence: number;
	hasVia: boolean;
	hasAngle: boolean;
}

export interface RoutingDragGeometry {
	source: Point;
	target: Point;
	dotStart: Point;
}

export interface RoutingPreview {
	angle?: number;
	via?: IRPosition;
}

export function useConnectionRoutingDrag({
	scale,
	onCommit,
}: {
	scale: Ref<number>;
	onCommit: (edit: ConnectionRoutingEdit) => void;
}) {
	const hoveredEdgeId = ref<string | null>(null);
	const draggingEdgeId = ref<string | null>(null);
	const previews = shallowRef(new Map<string, RoutingPreview>());
	const revertTimers = new Map<string, ReturnType<typeof setTimeout>>();

	let dragConnection: RoutingDragConnection | null = null;
	let dragGeometry: RoutingDragGeometry | null = null;
	let dragPointerStartX = 0;
	let dragPointerStartY = 0;
	let hasMovedPastClickThreshold = false;

	function setPreview(edgeId: string, preview: RoutingPreview): void {
		previews.value = new Map(previews.value).set(edgeId, preview);
	}

	function deletePreview(edgeId: string): void {
		const next = new Map(previews.value);
		next.delete(edgeId);
		previews.value = next;
	}

	function clearRevertTimer(edgeId: string): void {
		const timer = revertTimers.get(edgeId);
		if (timer !== undefined) clearTimeout(timer);
		revertTimers.delete(edgeId);
	}

	function previewFor(edgeId: string): RoutingPreview | undefined {
		return previews.value.get(edgeId);
	}

	function onEdgePointerEnter(edgeId: string): void {
		hoveredEdgeId.value = edgeId;
	}

	function onEdgePointerLeave(edgeId: string): void {
		if (hoveredEdgeId.value === edgeId) hoveredEdgeId.value = null;
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (event.key !== "Escape") return;
		cancelDrag();
	}

	function cancelDrag(): void {
		if (draggingEdgeId.value === null) return;
		deletePreview(draggingEdgeId.value);
		draggingEdgeId.value = null;
		dragConnection = null;
		dragGeometry = null;
		window.removeEventListener("keydown", onKeyDown);
	}

	function onDotPointerDown(
		event: PointerEvent,
		connection: RoutingDragConnection,
		geometry: RoutingDragGeometry,
	): void {
		event.stopPropagation();
		if (event.currentTarget instanceof Element) {
			capturePointerQuietly(event.currentTarget, event.pointerId);
		}
		draggingEdgeId.value = connection.id;
		dragConnection = connection;
		dragGeometry = geometry;
		dragPointerStartX = event.clientX;
		dragPointerStartY = event.clientY;
		hasMovedPastClickThreshold = false;
		clearRevertTimer(connection.id);
		window.addEventListener("keydown", onKeyDown);
	}

	function onDotPointerMove(event: PointerEvent): void {
		if (
			draggingEdgeId.value === null ||
			dragConnection === null ||
			dragGeometry === null
		) {
			return;
		}
		const pointerTravel = Math.hypot(
			event.clientX - dragPointerStartX,
			event.clientY - dragPointerStartY,
		);
		if (pointerTravel > ROUTING_DRAG_CLICK_THRESHOLD_PX) {
			hasMovedPastClickThreshold = true;
		}
		const dragPoint: Point = {
			x:
				dragGeometry.dotStart.x +
				(event.clientX - dragPointerStartX) / scale.value,
			y:
				dragGeometry.dotStart.y +
				(event.clientY - dragPointerStartY) / scale.value,
		};
		if (dragConnection.hasVia) {
			const via = { x: Math.round(dragPoint.x), y: Math.round(dragPoint.y) };
			if (dragConnection.hasAngle) {
				setPreview(dragConnection.id, {
					via,
					angle: viaDerivedCentralAngleDegrees(
						dragGeometry.source,
						via,
						dragGeometry.target,
					),
				});
				return;
			}
			setPreview(dragConnection.id, { via });
			return;
		}
		setPreview(dragConnection.id, {
			angle: clampDragAngleDegrees(
				centralAngleDegreesFromDragPoint(
					dragGeometry.source,
					dragGeometry.target,
					dragPoint,
				),
			),
		});
	}

	function onDotPointerUp(): void {
		if (
			draggingEdgeId.value === null ||
			dragConnection === null ||
			dragGeometry === null
		) {
			return;
		}
		const edgeId = draggingEdgeId.value;
		const connection = dragConnection;
		const preview = previews.value.get(edgeId);
		draggingEdgeId.value = null;
		dragConnection = null;
		dragGeometry = null;
		window.removeEventListener("keydown", onKeyDown);
		if (!hasMovedPastClickThreshold || preview === undefined) {
			deletePreview(edgeId);
			return;
		}
		const identity = {
			from: connection.from,
			polarity: connection.polarity,
			to: connection.to,
			occurrence: connection.occurrence,
		};
		if (preview.via !== undefined) {
			onCommit({
				connection: identity,
				via: { x: preview.via.x, y: preview.via.y },
				...(preview.angle !== undefined ? { angle: preview.angle } : {}),
			});
		} else if (preview.angle !== undefined) {
			onCommit({ connection: identity, angle: preview.angle });
		}
		clearRevertTimer(edgeId);
		revertTimers.set(
			edgeId,
			setTimeout(() => {
				deletePreview(edgeId);
				revertTimers.delete(edgeId);
			}, PREVIEW_REVERT_TIMEOUT_MS),
		);
	}

	function clearPreviews(): void {
		for (const timer of revertTimers.values()) clearTimeout(timer);
		revertTimers.clear();
		previews.value = new Map();
	}

	if (getCurrentInstance()) {
		onUnmounted(() => {
			window.removeEventListener("keydown", onKeyDown);
		});
	}

	return {
		hoveredEdgeId,
		draggingEdgeId,
		previewFor,
		onEdgePointerEnter,
		onEdgePointerLeave,
		onDotPointerDown,
		onDotPointerMove,
		onDotPointerUp,
		clearPreviews,
	};
}
