import type { IRTransport, InboundMessage, OutboundMessage } from "./types.js";
import { isInboundMessage } from "./types.js";
import type { IR } from "@sysdml/ir";

export class PostMessageAdapter implements IRTransport {
  private irCallbacks: Array<(ir: IR) => void> = [];
  private errorCallbacks: Array<(message: string) => void> = [];

  start(): void {
    const vscode = acquireVsCodeApi();
    const ready: OutboundMessage = { type: "ready" };
    vscode.postMessage(ready);

    window.addEventListener("message", (event: MessageEvent) => {
      if (!isInboundMessage(event.data)) return;
      const message = event.data;
      if (message.type === "update") {
        this.irCallbacks.forEach((cb) => cb(message.ir));
      } else if (message.type === "error") {
        this.errorCallbacks.forEach((cb) => cb(message.message));
      }
    });
  }

  onIR(cb: (ir: IR) => void): void {
    this.irCallbacks.push(cb);
  }

  onError(cb: (message: string) => void): void {
    this.errorCallbacks.push(cb);
  }
}
