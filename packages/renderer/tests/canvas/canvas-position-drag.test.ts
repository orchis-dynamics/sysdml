import type { ElementPositionEdit, IR } from "@sysdml/contracts";
// @vitest-environment happy-dom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, h, nextTick, shallowRef, type App } from "vue";

import Canvas from "../../src/canvas/Canvas.vue";
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

function positionedModel(): IR {
	return ir({
		model: { id: "m", kind: "cld" },
		auxiliaries: [aux("c", { x: 0, y: 0 }), aux("a", { x: 400, y: 0 })],
		connections: [connection("c", "a", "+")],
	});
}

function unpositionedModel(): IR {
	return ir({
		model: { id: "m", kind: "cld" },
		connections: [connection("c", "a", "+")],
	});
}

function mountCanvas(model: IR): {
	host: HTMLElement;
	app: App;
	irRef: ReturnType<typeof shallowRef<IR>>;
	onPositionEdit: ReturnType<typeof vi.fn>;
	onPinMissingPositions: ReturnType<typeof vi.fn>;
} {
	const onPositionEdit = vi.fn();
	const onPinMissingPositions = vi.fn();
	const irRef = shallowRef<IR>(model);
	const host = document.createElement("div");
	document.body.appendChild(host);
	const app = createApp({
		setup() {
			useProvideSimulatorState();
			return () =>
				h(Canvas, {
					ir: irRef.value,
					onPositionEdit,
					onPinMissingPositions,
				});
		},
	});
	app.mount(host);
	return { host, app, irRef, onPositionEdit, onPinMissingPositions };
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

describe("Canvas position drag integration", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	test("mounting an unpositioned model requests pinning exactly once", async () => {
		const { irRef, onPinMissingPositions } = mountCanvas(unpositionedModel());
		await nextTick();
		expect(onPinMissingPositions).toHaveBeenCalledTimes(1);
		irRef.value = unpositionedModel();
		await nextTick();
		expect(onPinMissingPositions).toHaveBeenCalledTimes(1);
	});

	test("a changed missing set requests pinning again", async () => {
		const { irRef, onPinMissingPositions } = mountCanvas(unpositionedModel());
		await nextTick();
		irRef.value = ir({
			model: { id: "m", kind: "cld" },
			connections: [connection("c", "a", "+"), connection("a", "d", "-")],
		});
		await nextTick();
		expect(onPinMissingPositions).toHaveBeenCalledTimes(2);
	});

	test("a fully positioned model never requests pinning", async () => {
		const { onPinMissingPositions } = mountCanvas(positionedModel());
		await nextTick();
		expect(onPinMissingPositions).not.toHaveBeenCalled();
	});

	test("dragging a node emits a structured-clone-safe positionEdit", async () => {
		const { host, onPositionEdit } = mountCanvas(positionedModel());
		await nextTick();
		const nodeEl = [...host.querySelectorAll("div")].find(
			(el) => el.textContent?.trim() === "c" && el.style.left !== "",
		);
		expect(nodeEl).toBeDefined();
		nodeEl!.dispatchEvent(pointer("pointerdown", 0, 0));
		await nextTick();
		nodeEl!.dispatchEvent(pointer("pointermove", 50, 40));
		await nextTick();
		nodeEl!.dispatchEvent(pointer("pointerup", 50, 40));
		await nextTick();
		expect(onPositionEdit).toHaveBeenCalledTimes(1);
		const edits: ElementPositionEdit[] = onPositionEdit.mock.calls[0][0];
		expect(edits).toHaveLength(1);
		expect(edits[0].id).toBe("c");
		expect(Number.isInteger(edits[0].position.x)).toBe(true);
		expect(() => structuredClone(edits)).not.toThrow();
	});
});
