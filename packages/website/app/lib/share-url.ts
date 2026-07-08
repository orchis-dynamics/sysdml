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

async function streamThrough(
	bytes: Uint8Array<ArrayBuffer>,
	stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
	const writer = stream.writable.getWriter();
	writer.write(bytes).catch(() => {});
	writer.close().catch(() => {});
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	const reader = stream.readable.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
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
		const decompressed = await streamThrough(
			compressed,
			new DecompressionStream("deflate-raw"),
		);
		return new TextDecoder().decode(decompressed);
	} catch {
		return null;
	}
}
