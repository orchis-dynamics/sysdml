// @vitest-environment happy-dom
import type { IR } from "@sysdml/contracts";
import { describe, expect, test } from "vitest";
import { createApp, h, nextTick } from "vue";

import SysdmlDiagram from "../src/SysdmlDiagram.vue";
import { ir, stock } from "./helpers/ir-builders.js";

class FakeSimulationWorker implements Worker {
	onerror = null;
	onmessage = null;
	onmessageerror = null;

	postMessage(): void {}
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
});
