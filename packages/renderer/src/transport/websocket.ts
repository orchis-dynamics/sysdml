import type { IR } from "@sysdml/contracts";

import type { IRTransport } from "./types.js";
import { isInboundMessage } from "./types.js";

declare const window: Window & { SYSDML_WS_URL?: string };

const INITIAL_RETRY_DELAY_MILLISECONDS = 1000;
const MAX_RETRY_DELAY_MILLISECONDS = 30000;

export class WebSocketAdapter implements IRTransport {
	private readonly url: string;
	private webSocket: WebSocket | null = null;
	private irCallbacks: Array<(ir: IR) => void> = [];
	private errorCallbacks: Array<(message: string) => void> = [];
	private retryDelayMilliseconds = INITIAL_RETRY_DELAY_MILLISECONDS;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private isStopped = false;

	constructor(url: string) {
		this.url = url;
	}

	start(): void {
		this.connect();
	}

	stop(): void {
		this.isStopped = true;
		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.webSocket?.close();
		this.webSocket = null;
	}

	onIR(cb: (ir: IR) => void): void {
		this.irCallbacks.push(cb);
	}

	onError(cb: (message: string) => void): void {
		this.errorCallbacks.push(cb);
	}

	sendRoutingEdit(): void {
		// intentionally empty — this transport does not persist routing edits
	}

	sendPositionEdits(): void {
		// intentionally empty — this transport does not persist position edits
	}

	sendPinMissingPositions(): void {
		// intentionally empty — this transport does not persist pin missing positions
	}

	private connect(): void {
		if (this.isStopped) return;
		const webSocket = new WebSocket(this.url);
		this.webSocket = webSocket;

		webSocket.addEventListener("open", () => {
			this.retryDelayMilliseconds = INITIAL_RETRY_DELAY_MILLISECONDS;
		});

		webSocket.addEventListener("message", (event: MessageEvent<string>) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(event.data);
			} catch {
				return;
			}
			if (!isInboundMessage(parsed)) return;
			const message = parsed;
			if (message.type === "update") {
				this.irCallbacks.forEach((cb) => cb(message.ir));
			} else if (message.type === "error") {
				this.errorCallbacks.forEach((cb) => cb(message.message));
			}
		});

		webSocket.addEventListener("close", () => {
			this.scheduleReconnect();
		});
	}

	private scheduleReconnect(): void {
		if (this.isStopped || this.reconnectTimer !== null) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.retryDelayMilliseconds = Math.min(
				this.retryDelayMilliseconds * 2,
				MAX_RETRY_DELAY_MILLISECONDS,
			);
			this.connect();
		}, this.retryDelayMilliseconds);
	}

	static resolveUrl(): string | null {
		if (window.SYSDML_WS_URL) {
			return window.SYSDML_WS_URL;
		}
		return null;
	}
}
