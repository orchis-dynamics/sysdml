import {
	createConnection,
	BrowserMessageReader,
	BrowserMessageWriter,
} from "vscode-languageserver/browser.js";

import { startServer } from "./server-core.js";

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

startServer(createConnection(messageReader, messageWriter));
