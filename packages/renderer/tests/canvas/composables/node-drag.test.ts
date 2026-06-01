// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { ref } from "vue";

import { useNodeDrag } from "../../../src/canvas/composables/node-drag.js";
import type { LayoutNode } from "../../../src/canvas/layout-types.js";

function makeNode(id: string): LayoutNode {
	return {
		id,
		kind: "aux",
		position: { x: 100, y: 200 },
		size: { width: 40, height: 40 },
	};
}

function pointerDown(clientX: number, clientY: number): PointerEvent {
	return new PointerEvent("pointerdown", { clientX, clientY, pointerId: 1 });
}

function pointerMove(clientX: number, clientY: number): PointerEvent {
	return new PointerEvent("pointermove", { clientX, clientY, pointerId: 1 });
}

describe("useNodeDrag", () => {
	test("resolveNode returns the node unchanged when no offset exists", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");
		expect(drag.resolveNode(node)).toBe(node);
	});

	test("accumulates a scale-aware offset across a drag", () => {
		const drag = useNodeDrag({ scale: ref(2) });
		const node = makeNode("a");

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(20, 40));

		expect(drag.resolveNode(node).position).toEqual({ x: 110, y: 220 });
	});

	test("a second drag continues from the previously applied offset", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(10, 0));
		drag.onNodePointerUp();

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(5, 0));

		expect(drag.resolveNode(node).position).toEqual({ x: 115, y: 200 });
	});

	test("hasMovedPastClickThreshold stays false at or below 4px of travel", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(4, 0));

		expect(drag.hasMovedPastClickThreshold.value).toBe(false);
	});

	test("hasMovedPastClickThreshold becomes true past 4px of travel", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(5, 0));

		expect(drag.hasMovedPastClickThreshold.value).toBe(true);
	});

	test("hasMovedPastClickThreshold resets on a new pointer down", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(20, 0));
		expect(drag.hasMovedPastClickThreshold.value).toBe(true);

		drag.onNodePointerDown(pointerDown(0, 0), node);
		expect(drag.hasMovedPastClickThreshold.value).toBe(false);
	});

	test("pointer move is ignored when no drag is active", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");

		drag.onNodePointerMove(pointerMove(50, 50));

		expect(drag.resolveNode(node)).toBe(node);
	});

	test("reset clears all offsets", () => {
		const drag = useNodeDrag({ scale: ref(1) });
		const node = makeNode("a");

		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(30, 0));
		drag.reset();

		expect(drag.resolveNode(node)).toBe(node);
	});
});
