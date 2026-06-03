import type { IR } from "@sysdml/contracts";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "@sysdml/contracts";

export interface IRTransport {
	start(): void;
	onIR(cb: (ir: IR) => void): void;
	onError(cb: (message: string) => void): void;
}

export type InboundMessage = ExtensionToWebviewMessage;
export type OutboundMessage = WebviewToExtensionMessage;

export function isInboundMessage(value: unknown): value is InboundMessage {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		((value as { type: unknown }).type === "update" ||
			(value as { type: unknown }).type === "error")
	);
}
