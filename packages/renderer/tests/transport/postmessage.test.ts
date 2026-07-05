// @vitest-environment happy-dom
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { PostMessageAdapter } from "../../src/transport/postmessage.js";

beforeEach(() => {
	vi.stubGlobal("acquireVsCodeApi", () => ({ postMessage: vi.fn() }));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function dispatchInboundError(text: string): void {
	window.dispatchEvent(
		new MessageEvent("message", { data: { type: "error", message: text } }),
	);
}

describe("PostMessageAdapter", () => {
	test("forwards inbound error messages after start", () => {
		const adapter = new PostMessageAdapter();
		const onError = vi.fn();
		adapter.onError(onError);
		adapter.start();
		dispatchInboundError("boom");
		expect(onError).toHaveBeenCalledWith("boom");
	});

	test("ignores malformed inbound messages", () => {
		const adapter = new PostMessageAdapter();
		const onIR = vi.fn();
		adapter.onIR(onIR);
		adapter.start();
		window.dispatchEvent(
			new MessageEvent("message", { data: { type: "update" } }),
		);
		expect(onIR).not.toHaveBeenCalled();
	});

	test("stop removes the window message listener", () => {
		const adapter = new PostMessageAdapter();
		const onError = vi.fn();
		adapter.onError(onError);
		adapter.start();
		adapter.stop();
		dispatchInboundError("after stop");
		expect(onError).not.toHaveBeenCalled();
	});

	test("sendRoutingEdit posts an editConnectionRouting message", () => {
		const postMessage = vi.fn();
		vi.stubGlobal("acquireVsCodeApi", () => ({ postMessage }));
		const adapter = new PostMessageAdapter();
		adapter.start();
		adapter.sendRoutingEdit({
			connection: { from: "a", polarity: "+", to: "b", occurrence: 0 },
			angle: 45,
		});
		expect(postMessage).toHaveBeenCalledWith({
			type: "editConnectionRouting",
			connection: { from: "a", polarity: "+", to: "b", occurrence: 0 },
			angle: 45,
		});
	});

	test("sendRoutingEdit before start is a no-op", () => {
		const adapter = new PostMessageAdapter();
		expect(() =>
			adapter.sendRoutingEdit({
				connection: { from: "a", polarity: "+", to: "b", occurrence: 0 },
				angle: 45,
			}),
		).not.toThrow();
	});
});
