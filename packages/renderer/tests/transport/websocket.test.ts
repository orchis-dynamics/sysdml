import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { WebSocketAdapter } from "../../src/transport/websocket.js";
import { ir } from "../helpers/ir-builders.js";

interface FakeWebSocketEventMap {
	open: undefined;
	message: { data: string };
	close: undefined;
}

class FakeWebSocket {
	static instances: FakeWebSocket[] = [];
	readonly url: string;
	isClosed = false;
	private listeners: {
		[EventName in keyof FakeWebSocketEventMap]: Array<
			(event: FakeWebSocketEventMap[EventName]) => void
		>;
	} = { open: [], message: [], close: [] };

	constructor(url: string) {
		this.url = url;
		FakeWebSocket.instances.push(this);
	}

	addEventListener<EventName extends keyof FakeWebSocketEventMap>(
		type: EventName,
		listener: (event: FakeWebSocketEventMap[EventName]) => void,
	): void {
		this.listeners[type].push(listener);
	}

	close(): void {
		this.isClosed = true;
	}

	fireOpen(): void {
		this.listeners.open.forEach((listener) => listener(undefined));
	}

	fireClose(): void {
		this.listeners.close.forEach((listener) => listener(undefined));
	}

	fireMessage(data: string): void {
		this.listeners.message.forEach((listener) => listener({ data }));
	}
}

function fakeSocketAt(index: number): FakeWebSocket {
	const instance = FakeWebSocket.instances[index];
	if (!instance) {
		throw new Error(`No FakeWebSocket instance at index ${index}`);
	}
	return instance;
}

beforeEach(() => {
	FakeWebSocket.instances = [];
	vi.useFakeTimers();
	vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("WebSocketAdapter", () => {
	test("start opens a socket and forwards update messages to onIR", () => {
		const adapter = new WebSocketAdapter("ws://localhost:1234/test");
		const onIR = vi.fn();
		adapter.onIR(onIR);
		adapter.start();
		expect(FakeWebSocket.instances).toHaveLength(1);
		fakeSocketAt(0).fireMessage(JSON.stringify({ type: "update", ir: ir() }));
		expect(onIR).toHaveBeenCalledTimes(1);
	});

	test("reconnects after the socket closes", () => {
		const adapter = new WebSocketAdapter("ws://localhost:1234/test");
		adapter.start();
		fakeSocketAt(0).fireClose();
		vi.advanceTimersByTime(1000);
		expect(FakeWebSocket.instances).toHaveLength(2);
	});

	test("stop closes the socket and prevents scheduling a reconnect", () => {
		const adapter = new WebSocketAdapter("ws://localhost:1234/test");
		adapter.start();
		adapter.stop();
		expect(fakeSocketAt(0).isClosed).toBe(true);
		fakeSocketAt(0).fireClose();
		vi.advanceTimersByTime(60000);
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	test("stop cancels an already-scheduled reconnect", () => {
		const adapter = new WebSocketAdapter("ws://localhost:1234/test");
		adapter.start();
		fakeSocketAt(0).fireClose();
		adapter.stop();
		vi.advanceTimersByTime(60000);
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	test("a successful connection resets the reconnect backoff", () => {
		const adapter = new WebSocketAdapter("ws://localhost:1234/test");
		adapter.start();
		fakeSocketAt(0).fireClose();
		vi.advanceTimersByTime(1000);
		expect(FakeWebSocket.instances).toHaveLength(2);
		fakeSocketAt(1).fireOpen();
		fakeSocketAt(1).fireClose();
		vi.advanceTimersByTime(1000);
		expect(FakeWebSocket.instances).toHaveLength(3);
	});

	test("the backoff doubles when the connection never opens", () => {
		const adapter = new WebSocketAdapter("ws://localhost:1234/test");
		adapter.start();
		fakeSocketAt(0).fireClose();
		vi.advanceTimersByTime(1000);
		expect(FakeWebSocket.instances).toHaveLength(2);
		fakeSocketAt(1).fireClose();
		vi.advanceTimersByTime(1999);
		expect(FakeWebSocket.instances).toHaveLength(2);
		vi.advanceTimersByTime(1);
		expect(FakeWebSocket.instances).toHaveLength(3);
	});
});
