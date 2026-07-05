import type { LayoutNode } from "@sysdml/layout";
import { ref, type Ref } from "vue";

const NODE_DRAG_CLICK_THRESHOLD_PX = 4;

interface DragOffset {
	x: number;
	y: number;
}

export function useNodeDrag({ scale }: { scale: Ref<number> }) {
	const dragOffsets = ref(new Map<string, DragOffset>());
	const hasMovedPastClickThreshold = ref(false);

	let draggingId: string | null = null;
	let dragBaseX = 0;
	let dragBaseY = 0;
	let dragPointerStartX = 0;
	let dragPointerStartY = 0;

	function resolveNode(node: LayoutNode): LayoutNode {
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

	function onNodePointerDown(event: PointerEvent, node: LayoutNode): void {
		event.stopPropagation();
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		draggingId = node.id;
		hasMovedPastClickThreshold.value = false;
		const existing = dragOffsets.value.get(node.id) ?? { x: 0, y: 0 };
		dragBaseX = existing.x;
		dragBaseY = existing.y;
		dragPointerStartX = event.clientX;
		dragPointerStartY = event.clientY;
	}

	function onNodePointerMove(event: PointerEvent): void {
		if (draggingId === null) return;
		const pointerTravel = Math.hypot(
			event.clientX - dragPointerStartX,
			event.clientY - dragPointerStartY,
		);
		if (pointerTravel > NODE_DRAG_CLICK_THRESHOLD_PX) {
			hasMovedPastClickThreshold.value = true;
		}
		const deltaX = (event.clientX - dragPointerStartX) / scale.value;
		const deltaY = (event.clientY - dragPointerStartY) / scale.value;
		dragOffsets.value = new Map(dragOffsets.value).set(draggingId, {
			x: dragBaseX + deltaX,
			y: dragBaseY + deltaY,
		});
	}

	function onNodePointerUp(): void {
		draggingId = null;
	}

	function reset(): void {
		dragOffsets.value = new Map();
	}

	return {
		hasMovedPastClickThreshold,
		resolveNode,
		onNodePointerDown,
		onNodePointerMove,
		onNodePointerUp,
		reset,
	};
}
