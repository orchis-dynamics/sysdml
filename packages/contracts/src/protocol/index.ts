import type { IRDiagnostic } from "../diagnostics/index.js";
import type { IR, IRPosition } from "../model/index.js";

export type ExtensionToWebviewMessage =
	| { type: "update"; ir: IR }
	| { type: "error"; message: string };

export interface ConnectionIdentity {
	from: string;
	polarity: "+" | "-" | "=>";
	to: string;
	occurrence: number;
}

export interface ConnectionRoutingEdit {
	connection: ConnectionIdentity;
	angle?: number;
	via?: IRPosition;
}

export interface ElementPositionEdit {
	id: string;
	position: IRPosition;
}

export type WebviewToExtensionMessage =
	| { type: "ready" }
	| ({ type: "editConnectionRouting" } & ConnectionRoutingEdit)
	| { type: "editElementPositions"; positions: ElementPositionEdit[] }
	| { type: "pinMissingPositions" };

export interface GetIRParams {
	uri: string;
}

export interface GetIRResult {
	ir: IR | null;
	diagnostics: IRDiagnostic[];
}

export interface UpdateConnectionRoutingParams extends ConnectionRoutingEdit {
	uri: string;
}

export interface UpdateElementPositionsParams {
	uri: string;
	positions: ElementPositionEdit[];
}

export interface PinMissingPositionsParams {
	uri: string;
}
