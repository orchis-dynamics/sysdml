// @vitest-environment happy-dom
import type { LayoutNode } from "@sysdml/layout";
import { describe, expect, test, vi } from "vitest";
import { ref } from "vue";

import { useNodeDrag } from "../../../src/canvas/composables/node-drag.js";

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

	test("release after a real drag commits the rounded resolved position once", () => {
		const onCommit = vi.fn();
		const drag = useNodeDrag({ scale: ref(2), onCommit });
		const node = {
			id: "s",
			kind: "stock",
			position: { x: 10.4, y: 20.4 },
			size: { width: 50, height: 20 },
		} as const;
		drag.onNodePointerDown(pointerDown(100, 100), node);
		drag.onNodePointerMove(pointerMove(121, 141));
		drag.onNodePointerUp();
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith([
			{ id: "s", position: { x: 21, y: 41 } },
		]);
	});

	test("a click without movement commits nothing", () => {
		const onCommit = vi.fn();
		const drag = useNodeDrag({ scale: ref(1), onCommit });
		const node = {
			id: "s",
			kind: "stock",
			position: { x: 0, y: 0 },
			size: { width: 50, height: 20 },
		} as const;
		drag.onNodePointerDown(pointerDown(100, 100), node);
		drag.onNodePointerMove(pointerMove(101, 101));
		drag.onNodePointerUp();
		expect(onCommit).not.toHaveBeenCalled();
	});

	test("commit payload survives structured clone", () => {
		const onCommit = vi.fn();
		const drag = useNodeDrag({ scale: ref(1), onCommit });
		const node = {
			id: "s",
			kind: "stock",
			position: { x: 0, y: 0 },
			size: { width: 50, height: 20 },
		} as const;
		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(30, 40));
		drag.onNodePointerUp();
		const payload = onCommit.mock.calls[0][0];
		expect(() => structuredClone(payload)).not.toThrow();
		expect(structuredClone(payload)).toEqual(payload);
	});

	test("reset cancels an in-flight drag without committing", () => {
		const onCommit = vi.fn();
		const drag = useNodeDrag({ scale: ref(1), onCommit });
		const node = {
			id: "s",
			kind: "stock",
			position: { x: 0, y: 0 },
			size: { width: 50, height: 20 },
		} as const;
		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(30, 40));
		drag.reset();
		drag.onNodePointerUp();
		expect(onCommit).not.toHaveBeenCalled();
	});

	test("a second drag on the same node commits its cumulative position", () => {
		const onCommit = vi.fn();
		const drag = useNodeDrag({ scale: ref(1), onCommit });
		const node = {
			id: "s",
			kind: "stock",
			position: { x: 0, y: 0 },
			size: { width: 50, height: 20 },
		} as const;
		drag.onNodePointerDown(pointerDown(0, 0), node);
		drag.onNodePointerMove(pointerMove(10, 0));
		drag.onNodePointerUp();
		const resolved = drag.resolveNode(node);
		drag.onNodePointerDown(pointerDown(0, 0), resolved);
		drag.onNodePointerMove(pointerMove(0, 10));
		drag.onNodePointerUp();
		expect(onCommit).toHaveBeenLastCalledWith([
			{ id: "s", position: { x: 10, y: 10 } },
		]);
	});
});
