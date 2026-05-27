import type { IRTransport } from "./types.js";
import { NullAdapter } from "./null.js";
import { PostMessageAdapter } from "./postmessage.js";
import { WebSocketAdapter } from "./websocket.js";

declare const window: Window & {
  SYSDML_WS_URL?: string;
};

export function createTransport(): IRTransport {
  if (typeof acquireVsCodeApi !== "undefined") {
    return new PostMessageAdapter();
  }

  const wsUrl = WebSocketAdapter.resolveUrl();
  if (wsUrl !== null) {
    return new WebSocketAdapter(wsUrl);
  }

  return new NullAdapter();
}
