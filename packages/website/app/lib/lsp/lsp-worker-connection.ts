import {
	BrowserMessageReader,
	BrowserMessageWriter,
	createMessageConnection,
	type MessageConnection,
} from "vscode-jsonrpc/browser.js";

import LspWorker from "../../workers/lsp.worker.ts?worker";

export function spawnLspWorkerConnection(): MessageConnection {
	const worker = new LspWorker();
	const reader = new BrowserMessageReader(worker);
	const writer = new BrowserMessageWriter(worker);
	return createMessageConnection(reader, writer);
}
