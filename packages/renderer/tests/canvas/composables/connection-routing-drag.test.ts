// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ref } from "vue";

import {
	useConnectionRoutingDrag,
	type RoutingDragConnection,
	type RoutingDragGeometry,
} from "../../../src/canvas/composables/connection-routing-drag.js";

const HORIZONTAL_GEOMETRY: RoutingDragGeometry = {
	source: { x: 0, y: 0 },
	target: { x: 100, y: 0 },
	dotStart: { x: 50, y: 0 },
};

function angleConnection(): RoutingDragConnection {
	return {
		id: "conn-a-+-b-0",
		from: "a",
		polarity: "+",
		to: "b",
		occurrence: 0,
		hasVia: false,
		hasAngle: false,
	};
}

function viaConnection(): RoutingDragConnection {
	return {
		id: "conn-a-+-b-0",
		from: "a",
		polarity: "+",
		to: "b",
		occurrence: 0,
		hasVia: true,
		hasAngle: false,
	};
}

function pointerDown(clientX: number, clientY: number): PointerEvent {
	return new PointerEvent("pointerdown", { clientX, clientY, pointerId: 1 });
}

function pointerMove(clientX: number, clientY: number): PointerEvent {
	return new PointerEvent("pointermove", { clientX, clientY, pointerId: 1 });
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useConnectionRoutingDrag", () => {
	test("hover tracks enter and leave", () => {
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit: vi.fn() });
		drag.onEdgePointerEnter("e1");
		expect(drag.hoveredEdgeId.value).toBe("e1");
		drag.onEdgePointerLeave("e1");
		expect(drag.hoveredEdgeId.value).toBeNull();
	});

	test("angle drag previews a clamped whole-degree angle", () => {
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit: vi.fn() });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(50, -20));
		const preview = drag.previewFor("conn-a-+-b-0");
		expect(preview?.angle).toBe(87);
	});

	test("dragging into the dead zone snaps to +15 or -15 by side", () => {
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit: vi.fn() });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(50, -1));
		expect(drag.previewFor("conn-a-+-b-0")?.angle).toBe(15);
		drag.onDotPointerMove(pointerMove(50, 1));
		expect(drag.previewFor("conn-a-+-b-0")?.angle).toBe(-15);
	});

	test("release commits the angle once", () => {
		const onCommit = vi.fn();
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(50, -20));
		drag.onDotPointerUp();
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith({
			connection: { from: "a", polarity: "+", to: "b", occurrence: 0 },
			angle: 87,
		});
	});

	test("a click without movement commits nothing", () => {
		const onCommit = vi.fn();
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(51, 1));
		drag.onDotPointerUp();
		expect(onCommit).not.toHaveBeenCalled();
		expect(drag.previewFor("conn-a-+-b-0")).toBeUndefined();
	});

	test("via drag previews and commits rounded coordinates", () => {
		const onCommit = vi.fn();
		const drag = useConnectionRoutingDrag({ scale: ref(2), onCommit });
		drag.onDotPointerDown(pointerDown(0, 0), viaConnection(), {
			source: { x: 0, y: 0 },
			target: { x: 100, y: 0 },
			dotStart: { x: 40, y: -30 },
		});
		drag.onDotPointerMove(pointerMove(21, -20));
		expect(drag.previewFor("conn-a-+-b-0")?.via).toEqual({ x: 51, y: -40 });
		drag.onDotPointerUp();
		expect(onCommit).toHaveBeenCalledWith({
			connection: { from: "a", polarity: "+", to: "b", occurrence: 0 },
			via: { x: 51, y: -40 },
		});
	});

	test("via commit payload survives structured clone for postMessage", () => {
		const onCommit = vi.fn();
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit });
		drag.onDotPointerDown(pointerDown(40, -30), viaConnection(), {
			source: { x: 0, y: 0 },
			target: { x: 100, y: 0 },
			dotStart: { x: 40, y: -30 },
		});
		drag.onDotPointerMove(pointerMove(60, -10));
		drag.onDotPointerUp();
		const commit = onCommit.mock.calls[0][0];
		expect(() => structuredClone(commit)).not.toThrow();
		expect(structuredClone(commit)).toEqual(commit);
	});

	test("via drag on a connection with angle also commits the derived angle", () => {
		const onCommit = vi.fn();
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit });
		drag.onDotPointerDown(
			pointerDown(40, -30),
			{ ...viaConnection(), hasAngle: true },
			{
				source: { x: 0, y: 0 },
				target: { x: 100, y: 0 },
				dotStart: { x: 40, y: -30 },
			},
		);
		drag.onDotPointerMove(pointerMove(40, -40));
		const previewedAngle = drag.previewFor("conn-a-+-b-0")?.angle;
		expect(typeof previewedAngle).toBe("number");
		drag.onDotPointerUp();
		const commit = onCommit.mock.calls[0][0];
		expect(commit.via).toEqual({ x: 40, y: -40 });
		expect(typeof commit.angle).toBe("number");
		expect(commit.angle).not.toBe(0);
		expect(commit.angle).toBe(previewedAngle);
	});

	test("escape cancels the drag without committing", () => {
		const onCommit = vi.fn();
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(50, -20));
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(drag.previewFor("conn-a-+-b-0")).toBeUndefined();
		expect(drag.draggingEdgeId.value).toBeNull();
		drag.onDotPointerUp();
		expect(onCommit).not.toHaveBeenCalled();
	});

	test("preview reverts after the fallback timeout", () => {
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit: vi.fn() });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(50, -20));
		drag.onDotPointerUp();
		expect(drag.previewFor("conn-a-+-b-0")?.angle).toBe(87);
		vi.advanceTimersByTime(2000);
		expect(drag.previewFor("conn-a-+-b-0")).toBeUndefined();
	});

	test("clearPreviews wipes previews immediately", () => {
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit: vi.fn() });
		drag.onDotPointerDown(pointerDown(50, 0), angleConnection(), {
			...HORIZONTAL_GEOMETRY,
		});
		drag.onDotPointerMove(pointerMove(50, -20));
		drag.onDotPointerUp();
		drag.clearPreviews();
		expect(drag.previewFor("conn-a-+-b-0")).toBeUndefined();
	});

	test("drag starts even when the browser rejects pointer capture", () => {
		const drag = useConnectionRoutingDrag({ scale: ref(1), onCommit: vi.fn() });
		const capturingTarget = document.createElement("div");
		capturingTarget.setPointerCapture = () => {
			throw new DOMException(
				"The object is in an invalid state.",
				"InvalidStateError",
			);
		};
		const event = new PointerEvent("pointerdown", {
			clientX: 50,
			clientY: 0,
			pointerId: 1,
		});
		Object.defineProperty(event, "currentTarget", {
			value: capturingTarget,
			configurable: true,
		});

		expect(() =>
			drag.onDotPointerDown(event, angleConnection(), {
				...HORIZONTAL_GEOMETRY,
			}),
		).not.toThrow();
		expect(drag.draggingEdgeId.value).toBe("conn-a-+-b-0");

		drag.onDotPointerMove(pointerMove(50, -20));
		expect(drag.previewFor("conn-a-+-b-0")?.angle).toBe(87);
	});
});
