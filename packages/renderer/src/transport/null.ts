import type { IR } from "@sysdml/contracts";

import type { IRTransport } from "./types.js";

export class NullAdapter implements IRTransport {
	private irCallbacks: Array<(ir: IR) => void> = [];
	private errorCallbacks: Array<(message: string) => void> = [];

	start(): void {
		// intentionally empty — no transport, canvas stays blank
	}

	onIR(cb: (ir: IR) => void): void {
		this.irCallbacks.push(cb);
	}

	onError(cb: (message: string) => void): void {
		this.errorCallbacks.push(cb);
	}
}
