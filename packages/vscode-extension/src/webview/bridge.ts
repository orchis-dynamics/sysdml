import type { IR } from "@sysdml/ir";

export type ExtensionToWebViewMessage =
	| { type: "update"; ir: IR }
	| { type: "error"; message: string };

export type WebViewToExtensionMessage = { type: "ready" };
