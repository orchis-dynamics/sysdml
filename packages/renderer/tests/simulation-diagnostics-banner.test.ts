// @vitest-environment happy-dom
import type { SimDiagnostic } from "@sysdml/contracts";
import { describe, expect, test } from "vitest";
import { createApp, h } from "vue";

import SimulationDiagnosticsBanner from "../src/SimulationDiagnosticsBanner.vue";

function mountBanner(diagnostics: SimDiagnostic[]): HTMLElement {
	const host = document.createElement("div");
	const app = createApp({
		render: () => h(SimulationDiagnosticsBanner, { diagnostics }),
	});
	app.mount(host);
	return host;
}

describe("SimulationDiagnosticsBanner", () => {
	test("renders a visible banner for a warning diagnostic", () => {
		const host = mountBanner([
			{ code: "warning", message: "FORCST is not supported by the engine" },
		]);
		expect(host.textContent).toContain(
			"FORCST is not supported by the engine",
		);
		const banner = host.querySelector("div");
		expect(banner?.className).toContain("bg-amber-50");
	});

	test("styles an error diagnostic as an error banner", () => {
		const host = mountBanner([{ code: "error", message: "engine failure" }]);
		expect(host.textContent).toContain("engine failure");
		const banner = host.querySelector("div");
		expect(banner?.className).toContain("bg-red-50");
	});

	test("renders one banner per diagnostic", () => {
		const host = mountBanner([
			{ code: "warning", message: "first" },
			{ code: "warning", message: "second" },
		]);
		expect(host.querySelectorAll("div")).toHaveLength(2);
	});

	test("renders nothing when there are no diagnostics", () => {
		const host = mountBanner([]);
		expect(host.querySelectorAll("div")).toHaveLength(0);
	});
});
