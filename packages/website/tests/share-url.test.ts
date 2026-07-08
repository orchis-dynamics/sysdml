// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";

import {
	encodeSourceToHash,
	decodeSourceFromHash,
} from "../app/lib/share-url";

describe("share-url", () => {
	test("round-trips a model source", async () => {
		const source = "sfd demo\n\nstock population {\n  init: 1000\n}\n";
		const hash = await encodeSourceToHash(source);
		expect(hash).not.toContain("#");
		const decoded = await decodeSourceFromHash(hash);
		expect(decoded).toBe(source);
	});

	test("accepts a fragment with a leading hash", async () => {
		const source = "aux x = 1\n";
		const hash = await encodeSourceToHash(source);
		const decoded = await decodeSourceFromHash(`#${hash}`);
		expect(decoded).toBe(source);
	});

	test("returns null for malformed input", async () => {
		expect(await decodeSourceFromHash("!!!not-base64!!!")).toBeNull();
		expect(await decodeSourceFromHash("")).toBeNull();
		expect(await decodeSourceFromHash("#")).toBeNull();
	});

	test("returns null for valid base64url that is not valid deflate-raw data", async () => {
		expect(await decodeSourceFromHash("AAAAAAAA")).toBeNull();
	});

	test("returns null when the decompressed content exceeds the size cap", async () => {
		const oversizedSource = "a".repeat(1_100_000);
		const hash = await encodeSourceToHash(oversizedSource);
		expect(await decodeSourceFromHash(hash)).toBeNull();
	});

	test("still round-trips a realistic multi-kilobyte model source", async () => {
		const stockDefinition = "stock population {\n  init: 1000\n}\n\n";
		const source = "sfd demo\n\n" + stockDefinition.repeat(80);
		const hash = await encodeSourceToHash(source);
		const decoded = await decodeSourceFromHash(hash);
		expect(decoded).toBe(source);
	});
});
