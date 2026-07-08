import { describe, expect, test, vi } from "vitest";

import { createLspClient } from "../app/lib/lsp/lsp-client";
import type { LspConnection } from "../app/lib/lsp/lsp-client";

function makeFakeConnection() {
	const sendRequest = vi.fn();
	const sendNotification = vi.fn();
	const onNotification = vi.fn();
	const onRequest = vi.fn();
	const listen = vi.fn();
	const dispose = vi.fn();
	const connection: LspConnection = {
		sendRequest,
		sendNotification,
		onNotification,
		onRequest,
		listen,
		dispose,
	};
	return {
		connection,
		sendRequest,
		sendNotification,
		onNotification,
		onRequest,
		listen,
		dispose,
	};
}

describe("lsp-client", () => {
	test("initialize sends initialize + initialized", async () => {
		const { connection, sendRequest, sendNotification } = makeFakeConnection();
		const client = createLspClient(connection);
		await client.initialize();
		expect(sendRequest).toHaveBeenCalledWith(
			"initialize",
			expect.objectContaining({ capabilities: expect.any(Object) }),
		);
		expect(sendNotification).toHaveBeenCalledWith("initialized", {});
	});

	test("didChange sends a versioned incremental change", () => {
		const { connection, sendNotification } = makeFakeConnection();
		const client = createLspClient(connection);
		client.didChange("inmemory://playground.sysdml", 7, [
			{
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 },
				},
				text: "x",
			},
		]);
		expect(sendNotification).toHaveBeenCalledWith(
			"textDocument/didChange",
			expect.objectContaining({
				textDocument: {
					uri: "inmemory://playground.sysdml",
					version: 7,
				},
				contentChanges: [expect.objectContaining({ text: "x" })],
			}),
		);
	});

	test("getIR issues the custom request", async () => {
		const { connection, sendRequest } = makeFakeConnection();
		sendRequest.mockResolvedValue({ ir: null, diagnostics: [] });
		const client = createLspClient(connection);
		const result = await client.getIR("inmemory://playground.sysdml");
		expect(sendRequest).toHaveBeenCalledWith("sysdml/getIR", {
			uri: "inmemory://playground.sysdml",
		});
		expect(result).toEqual({ ir: null, diagnostics: [] });
	});

	test("updateElementPositions issues the custom notification", () => {
		const { connection, sendNotification } = makeFakeConnection();
		const client = createLspClient(connection);
		client.updateElementPositions({
			uri: "inmemory://playground.sysdml",
			positions: [{ id: "population", position: { x: 1, y: 2 } }],
		});
		expect(sendNotification).toHaveBeenCalledWith(
			"sysdml/updateElementPositions",
			expect.objectContaining({ uri: "inmemory://playground.sysdml" }),
		);
	});
});
