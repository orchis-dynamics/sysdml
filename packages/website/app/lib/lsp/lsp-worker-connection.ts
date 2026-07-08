import {
	BrowserMessageReader,
	BrowserMessageWriter,
	createMessageConnection,
	type MessageConnection,
} from "vscode-jsonrpc/browser.js";

import LspWorker from "../../workers/lsp.worker.ts?worker";

export interface LspWorkerConnection {
	connection: MessageConnection;
	terminateWorker(): void;
}

export function spawnLspWorkerConnection(): LspWorkerConnection {
	const worker = new LspWorker();
	const reader = new BrowserMessageReader(worker);
	const writer = new BrowserMessageWriter(worker);
	const connection = createMessageConnection(reader, writer);
	return {
		connection,
		terminateWorker: () => worker.terminate(),
	};
}
