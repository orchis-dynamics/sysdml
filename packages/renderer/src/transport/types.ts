import type { IR } from "@sysdml/ir";

export interface IRTransport {
  start(): void;
  onIR(cb: (ir: IR) => void): void;
  onError(cb: (message: string) => void): void;
}

export type InboundMessage =
  | { type: "update"; ir: IR }
  | { type: "error"; message: string };

export type OutboundMessage = { type: "ready" };

export function isInboundMessage(value: unknown): value is InboundMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    ((value as { type: unknown }).type === "update" ||
      (value as { type: unknown }).type === "error")
  );
}
