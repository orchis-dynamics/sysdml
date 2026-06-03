import type { IR } from "../model/index.js";

export type ExtensionToWebviewMessage =
	| { type: "update"; ir: IR }
	| { type: "error"; message: string };

export type WebviewToExtensionMessage = { type: "ready" };
