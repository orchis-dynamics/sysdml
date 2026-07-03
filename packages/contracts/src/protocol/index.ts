import type { IRDiagnostic } from "../diagnostics/index.js";
import type { IR } from "../model/index.js";

export type ExtensionToWebviewMessage =
	| { type: "update"; ir: IR }
	| { type: "error"; message: string };

export type WebviewToExtensionMessage = { type: "ready" };

export interface GetIRParams {
	uri: string;
}

export interface GetIRResult {
	ir: IR | null;
	diagnostics: IRDiagnostic[];
}
