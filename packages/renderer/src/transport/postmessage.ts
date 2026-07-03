import type { IR } from "@sysdml/contracts";

import type { IRTransport, OutboundMessage } from "./types.js";
import { isInboundMessage } from "./types.js";

export class PostMessageAdapter implements IRTransport {
	private irCallbacks: Array<(ir: IR) => void> = [];
	private errorCallbacks: Array<(message: string) => void> = [];
	private messageListener: ((event: MessageEvent) => void) | null = null;

	start(): void {
		const vscode = acquireVsCodeApi();
		const ready: OutboundMessage = { type: "ready" };
		vscode.postMessage(ready);

		this.messageListener = (event: MessageEvent) => {
			if (!isInboundMessage(event.data)) return;
			const message = event.data;
			if (message.type === "update") {
				this.irCallbacks.forEach((cb) => cb(message.ir));
			} else if (message.type === "error") {
				this.errorCallbacks.forEach((cb) => cb(message.message));
			}
		};
		window.addEventListener("message", this.messageListener);
	}

	stop(): void {
		if (this.messageListener === null) return;
		window.removeEventListener("message", this.messageListener);
		this.messageListener = null;
	}

	onIR(cb: (ir: IR) => void): void {
		this.irCallbacks.push(cb);
	}

	onError(cb: (message: string) => void): void {
		this.errorCallbacks.push(cb);
	}
}
