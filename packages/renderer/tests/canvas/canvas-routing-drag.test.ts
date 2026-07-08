import type { ConnectionRoutingEdit, IR } from "@sysdml/contracts";
// @vitest-environment happy-dom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";

import Canvas from "../../src/canvas/Canvas.vue";
import { useProvideModelState } from "../../src/state/model-state.js";
import { useProvideSimulatorState } from "../../src/state/simulator-state.js";
import { aux, connection, ir } from "../helpers/ir-builders.js";

if (!Element.prototype.setPointerCapture) {
	Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
	Element.prototype.releasePointerCapture = () => {};
}
if (typeof globalThis.ResizeObserver === "undefined") {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
}

function viaModel(): IR {
	return ir({
		model: { id: "m", kind: "cld" },
		auxiliaries: [aux("c", { x: 0, y: 0 }), aux("a", { x: 400, y: 0 })],
		connections: [connection("c", "a", "+", { via: { x: 200, y: 200 } })],
	});
}

function mountCanvas(
	model: IR,
	onRoutingEdit: (edit: ConnectionRoutingEdit) => void,
): {
	host: HTMLElement;
	app: App;
} {
	const host = document.createElement("div");
	document.body.appendChild(host);
	const app = createApp({
		setup() {
			useProvideSimulatorState();
			useProvideModelState(ref(model));
			return () => h(Canvas, { onRoutingEdit });
		},
	});
	app.mount(host);
	return { host, app };
}

function pointer(type: string, clientX: number, clientY: number): PointerEvent {
	return new PointerEvent(type, {
		clientX,
		clientY,
		pointerId: 1,
		bubbles: true,
		composed: true,
	});
}

function findHitPath(host: HTMLElement): SVGPathElement {
	const paths = [...host.querySelectorAll("path")];
	const hit = paths.find((p) => p.getAttribute("stroke") === "transparent");
	if (!hit) throw new Error("no hit path rendered");
	return hit as unknown as SVGPathElement;
}

describe("Canvas routing drag integration", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	test("via drag on a real mounted Canvas emits a routingEdit commit", async () => {
		const onRoutingEdit = vi.fn();
		const { host } = mountCanvas(viaModel(), onRoutingEdit);
		await nextTick();

		findHitPath(host).dispatchEvent(pointer("pointerenter", 200, 200));
		await nextTick();

		const circle = host.querySelector("circle");
		expect(circle).not.toBeNull();

		circle!.dispatchEvent(pointer("pointerdown", 200, 200));
		await nextTick();

		circle!.dispatchEvent(pointer("pointermove", 250, 240));
		await nextTick();

		const circleAfterMove = host.querySelector("circle");
		expect(circleAfterMove).not.toBeNull();

		(circleAfterMove ?? host).dispatchEvent(pointer("pointerup", 250, 240));
		await nextTick();

		expect(onRoutingEdit).toHaveBeenCalledTimes(1);
		expect(onRoutingEdit.mock.calls[0][0]).toMatchObject({
			connection: { from: "c", polarity: "+", to: "a", occurrence: 0 },
		});
		expect(onRoutingEdit.mock.calls[0][0].via).toBeDefined();
		expect(() => structuredClone(onRoutingEdit.mock.calls[0][0])).not.toThrow();
	});
});
