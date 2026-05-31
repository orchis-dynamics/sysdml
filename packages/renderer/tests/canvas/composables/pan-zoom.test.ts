// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { ref } from "vue";

import { usePanZoom } from "../../../src/canvas/composables/pan-zoom.js";

function nullContainer() {
	return ref<HTMLElement | null>(null);
}

function pointerDown(
	button: number,
	clientX: number,
	clientY: number,
): PointerEvent {
	return new PointerEvent("pointerdown", {
		button,
		clientX,
		clientY,
		pointerId: 1,
	});
}

function pointerMove(clientX: number, clientY: number): PointerEvent {
	return new PointerEvent("pointermove", { clientX, clientY, pointerId: 1 });
}

function wheel(deltaY: number, clientX: number, clientY: number): WheelEvent {
	const event = new WheelEvent("wheel", { deltaY });
	Object.defineProperty(event, "clientX", { value: clientX });
	Object.defineProperty(event, "clientY", { value: clientY });
	return event;
}

describe("usePanZoom", () => {
	test("transform reflects translate and scale", () => {
		const panZoom = usePanZoom(nullContainer());
		expect(panZoom.transform.value).toBe("translate(0px, 0px) scale(1)");
	});

	test("pan moves translate by the pointer delta after a left-button down", () => {
		const panZoom = usePanZoom(nullContainer());
		panZoom.onPointerDown(pointerDown(0, 100, 100));
		panZoom.onPointerMove(pointerMove(130, 160));
		expect(panZoom.translateX.value).toBe(30);
		expect(panZoom.translateY.value).toBe(60);
	});

	test("pointer move without a button-down does not pan", () => {
		const panZoom = usePanZoom(nullContainer());
		panZoom.onPointerMove(pointerMove(130, 160));
		expect(panZoom.translateX.value).toBe(0);
		expect(panZoom.translateY.value).toBe(0);
	});

	test("right-button down does not start a pan", () => {
		const panZoom = usePanZoom(nullContainer());
		panZoom.onPointerDown(pointerDown(2, 100, 100));
		panZoom.onPointerMove(pointerMove(130, 160));
		expect(panZoom.translateX.value).toBe(0);
		expect(panZoom.translateY.value).toBe(0);
	});

	test("wheel up zooms in by 1.1x", () => {
		const panZoom = usePanZoom(nullContainer());
		panZoom.onWheel(wheel(-100, 0, 0));
		expect(panZoom.scale.value).toBeCloseTo(1.1);
	});

	test("wheel down zooms out by 0.9x", () => {
		const panZoom = usePanZoom(nullContainer());
		panZoom.onWheel(wheel(100, 0, 0));
		expect(panZoom.scale.value).toBeCloseTo(0.9);
	});

	test("zoom keeps the point under the cursor fixed", () => {
		const panZoom = usePanZoom(nullContainer());
		panZoom.onWheel(wheel(-100, 200, 100));

		const scale = panZoom.scale.value;
		const worldXBefore = (200 - 0) / 1;
		const worldXAfter = (200 - panZoom.translateX.value) / scale;
		const worldYBefore = (100 - 0) / 1;
		const worldYAfter = (100 - panZoom.translateY.value) / scale;

		expect(worldXAfter).toBeCloseTo(worldXBefore);
		expect(worldYAfter).toBeCloseTo(worldYBefore);
	});

	test("scale clamps at the maximum of 10", () => {
		const panZoom = usePanZoom(nullContainer());
		for (let i = 0; i < 100; i++) {
			panZoom.onWheel(wheel(-100, 0, 0));
		}
		expect(panZoom.scale.value).toBe(10);
	});

	test("scale clamps at the minimum of 0.1", () => {
		const panZoom = usePanZoom(nullContainer());
		for (let i = 0; i < 100; i++) {
			panZoom.onWheel(wheel(100, 0, 0));
		}
		expect(panZoom.scale.value).toBe(0.1);
	});
});
