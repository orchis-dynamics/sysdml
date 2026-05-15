import type { IRTransport, InboundMessage } from "./types.js";
import { isInboundMessage } from "./types.js";
import type { IR } from "@sysdml/ir";

declare const __SYSDML_WS_PATH__: string | undefined;
declare const window: Window & { SYSDML_WS_URL?: string };

export class WebSocketAdapter implements IRTransport {
  private readonly url: string;
  private ws: WebSocket | null = null;
  private irCallbacks: Array<(ir: IR) => void> = [];
  private errorCallbacks: Array<(message: string) => void> = [];
  private retryDelay = 1000;

  constructor(url: string) {
    this.url = url;
  }

  start(): void {
    this.connect();
  }

  onIR(cb: (ir: IR) => void): void {
    this.irCallbacks.push(cb);
  }

  onError(cb: (message: string) => void): void {
    this.errorCallbacks.push(cb);
  }

  private connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("message", (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!isInboundMessage(parsed)) return;
      const message = parsed;
      if (message.type === "update") {
        this.retryDelay = 1000;
        this.irCallbacks.forEach((cb) => cb(message.ir));
      } else if (message.type === "error") {
        this.errorCallbacks.forEach((cb) => cb(message.message));
      }
    });

    this.ws.addEventListener("close", () => {
      setTimeout(() => {
        this.retryDelay = Math.min(this.retryDelay * 2, 30000);
        this.connect();
      }, this.retryDelay);
    });
  }

  static resolveUrl(): string | null {
    if (typeof __SYSDML_WS_PATH__ !== "undefined" && __SYSDML_WS_PATH__) {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${location.host}${__SYSDML_WS_PATH__}`;
    }
    if (window.SYSDML_WS_URL) {
      return window.SYSDML_WS_URL;
    }
    return null;
  }
}
