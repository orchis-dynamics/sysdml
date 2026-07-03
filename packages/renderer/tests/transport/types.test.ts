import { describe, expect, test } from "vitest";

import { isInboundMessage } from "../../src/transport/types.js";
import { ir } from "../helpers/ir-builders.js";

describe("isInboundMessage", () => {
	test("accepts an update message with an object ir", () => {
		expect(isInboundMessage({ type: "update", ir: ir() })).toBe(true);
	});

	test("rejects an update message without an ir", () => {
		expect(isInboundMessage({ type: "update" })).toBe(false);
	});

	test("rejects an update message with a non-object ir", () => {
		expect(isInboundMessage({ type: "update", ir: "bogus" })).toBe(false);
		expect(isInboundMessage({ type: "update", ir: null })).toBe(false);
	});

	test("accepts an error message with a string message", () => {
		expect(isInboundMessage({ type: "error", message: "boom" })).toBe(true);
	});

	test("rejects an error message without a string message", () => {
		expect(isInboundMessage({ type: "error" })).toBe(false);
		expect(isInboundMessage({ type: "error", message: 42 })).toBe(false);
	});

	test("rejects unknown types, null, and primitives", () => {
		expect(isInboundMessage({ type: "bogus" })).toBe(false);
		expect(isInboundMessage(null)).toBe(false);
		expect(isInboundMessage("update")).toBe(false);
		expect(isInboundMessage(undefined)).toBe(false);
	});
});
