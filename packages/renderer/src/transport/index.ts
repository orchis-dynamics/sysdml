import { NullAdapter } from "./null.js";
import { PostMessageAdapter } from "./postmessage.js";
import type { IRTransport } from "./types.js";
import { WebSocketAdapter } from "./websocket.js";

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
