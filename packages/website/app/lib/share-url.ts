const MAX_DECODED_BYTES = 1_000_000;

function bytesToBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

function writeToStream(
	bytes: Uint8Array<ArrayBuffer>,
	writable: WritableStream<Uint8Array<ArrayBuffer>>,
): void {
	const writer = writable.getWriter();
	writer.write(bytes).catch(() => {});
	writer.close().catch(() => {});
}

function concatChunks(
	chunks: Uint8Array<ArrayBuffer>[],
): Uint8Array<ArrayBuffer> {
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

async function streamThrough(
	bytes: Uint8Array<ArrayBuffer>,
	stream: CompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
	writeToStream(bytes, stream.writable);
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	const reader = stream.readable.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}
	return concatChunks(chunks);
}

async function decompressWithCap(
	bytes: Uint8Array<ArrayBuffer>,
	stream: DecompressionStream,
	maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
	writeToStream(bytes, stream.writable);
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let totalBytes = 0;
	const reader = stream.readable.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		if (value) {
			totalBytes += value.length;
			if (totalBytes > maxBytes) {
				await reader.cancel();
				return null;
			}
			chunks.push(value);
		}
	}
	return concatChunks(chunks);
}

export async function encodeSourceToHash(source: string): Promise<string> {
	const input = new TextEncoder().encode(source);
	const compressed = await streamThrough(
		input,
		new CompressionStream("deflate-raw"),
	);
	return bytesToBase64Url(compressed);
}

export async function decodeSourceFromHash(
	hash: string,
): Promise<string | null> {
	const value = hash.startsWith("#") ? hash.slice(1) : hash;
	if (value.length === 0) return null;
	try {
		const compressed = base64UrlToBytes(value);
		const decompressed = await decompressWithCap(
			compressed,
			new DecompressionStream("deflate-raw"),
			MAX_DECODED_BYTES,
		);
		if (decompressed === null) return null;
		return new TextDecoder().decode(decompressed);
	} catch {
		return null;
	}
}
