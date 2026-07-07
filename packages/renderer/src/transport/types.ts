import type {
	ConnectionRoutingEdit,
	ElementPositionEdit,
	IR,
} from "@sysdml/contracts";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "@sysdml/contracts";

export interface IRTransport {
	start(): void;
	stop(): void;
	onIR(cb: (ir: IR) => void): void;
	onError(cb: (message: string) => void): void;
	sendRoutingEdit(edit: ConnectionRoutingEdit): void;
	sendPositionEdits(positions: ElementPositionEdit[]): void;
	sendPinMissingPositions(): void;
}

export type InboundMessage = ExtensionToWebviewMessage;
export type OutboundMessage = WebviewToExtensionMessage;

export function isInboundMessage(value: unknown): value is InboundMessage {
	if (typeof value !== "object" || value === null || !("type" in value)) {
		return false;
	}
	if (value.type === "update") {
		return "ir" in value && typeof value.ir === "object" && value.ir !== null;
	}
	if (value.type === "error") {
		return "message" in value && typeof value.message === "string";
	}
	return false;
}
