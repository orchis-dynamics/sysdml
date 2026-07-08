// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vitest";

import {
	capturePointerQuietly,
	releasePointerCaptureQuietly,
} from "../../../src/canvas/composables/pointer-capture.js";

describe("pointer-capture", () => {
	test("capturePointerQuietly forwards the pointer id to the element", () => {
		const element = document.createElement("div");
		const setPointerCapture = vi.fn();
		element.setPointerCapture = setPointerCapture;
		capturePointerQuietly(element, 7);
		expect(setPointerCapture).toHaveBeenCalledWith(7);
	});

	test("capturePointerQuietly swallows a rejected capture", () => {
		const element = document.createElement("div");
		element.setPointerCapture = () => {
			throw new DOMException(
				"The object is in an invalid state.",
				"InvalidStateError",
			);
		};
		expect(() => capturePointerQuietly(element, 1)).not.toThrow();
	});

	test("releasePointerCaptureQuietly swallows a rejected release", () => {
		const element = document.createElement("div");
		element.releasePointerCapture = () => {
			throw new DOMException(
				"The object is in an invalid state.",
				"InvalidStateError",
			);
		};
		expect(() => releasePointerCaptureQuietly(element, 1)).not.toThrow();
	});
});
