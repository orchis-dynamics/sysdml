// @vitest-environment happy-dom
import type { IR } from "@sysdml/contracts";
import { describe, expect, test, beforeEach } from "vitest";
import { createApp, h, nextTick, reactive } from "vue";

import type { WorkerRequest } from "../src/simulation/types.js";
import SysdmlDiagram from "../src/SysdmlDiagram.vue";
import { ir, stock } from "./helpers/ir-builders.js";

const capturedSimulationRequests: WorkerRequest[] = [];

class FakeSimulationWorker implements Worker {
	onerror = null;
	onmessage = null;
	onmessageerror = null;

	postMessage(message: WorkerRequest): void {
		capturedSimulationRequests.push(message);
	}
	terminate(): void {}
	addEventListener(): void {}
	removeEventListener(): void {}
	dispatchEvent(): boolean {
		return true;
	}
}

if (typeof globalThis.Worker === "undefined") {
	globalThis.Worker = FakeSimulationWorker;
}

function makeIr(): IR {
	return ir({ stocks: [stock("population")] });
}

describe("SysdmlDiagram", () => {
	beforeEach(() => {
		capturedSimulationRequests.length = 0;
	});

	test("renders the error banner when errorMessage is set", async () => {
		const host = document.createElement("div");
		const app = createApp({
			render: () => h(SysdmlDiagram, { ir: null, errorMessage: "boom" }),
		});
		app.mount(host);
		await nextTick();
		expect(host.textContent).toContain("boom");
		app.unmount();
	});

	test("mounts with an IR without throwing", async () => {
		const host = document.createElement("div");
		const app = createApp({
			render: () => h(SysdmlDiagram, { ir: makeIr(), errorMessage: null }),
		});
		expect(() => app.mount(host)).not.toThrow();
		await nextTick();
		app.unmount();
	});

	test("posts a structured-clone-safe payload to the simulation worker when the IR prop is reactive", async () => {
		const reactiveIr = reactive(makeIr());
		const host = document.createElement("div");
		const app = createApp({
			render: () => h(SysdmlDiagram, { ir: reactiveIr, errorMessage: null }),
		});
		app.mount(host);
		await nextTick();
		expect(capturedSimulationRequests.length).toBeGreaterThan(0);
		const lastRequest =
			capturedSimulationRequests[capturedSimulationRequests.length - 1];
		expect(() => structuredClone(lastRequest)).not.toThrow();
		expect(structuredClone(lastRequest)).toEqual(lastRequest);
		app.unmount();
	});
});
