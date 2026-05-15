import type { IRTransport } from "./types.js";
import { NullAdapter } from "./null.js";
import { PostMessageAdapter } from "./postmessage.js";
import { WebSocketAdapter } from "./websocket.js";

declare const window: Window & {
  __VSCODE_CONTEXT__?: boolean;
  SYSDML_WS_URL?: string;
};

export function createTransport(): IRTransport {
  if (window.__VSCODE_CONTEXT__ === true) {
    return new PostMessageAdapter();
  }

  const wsUrl = WebSocketAdapter.resolveUrl();
  if (wsUrl !== null) {
    return new WebSocketAdapter(wsUrl);
  }

  return new NullAdapter();
}
