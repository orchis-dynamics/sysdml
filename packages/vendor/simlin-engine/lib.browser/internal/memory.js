import { getExports, getMemory } from '@simlin/engine/internal/wasm';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
export function malloc(size) {
    const exports = getExports();
    const fn = exports.simlin_malloc;
    const ptr = fn(size);
    if (ptr === 0 && size !== 0) {
        throw new Error('WASM allocation failed');
    }
    return ptr;
}
export function free(ptr) {
    if (ptr === 0)
        return;
    const exports = getExports();
    const fn = exports.simlin_free;
    fn(ptr);
}
export function freeString(ptr) {
    if (ptr === 0)
        return;
    const exports = getExports();
    const fn = exports.simlin_free_string;
    fn(ptr);
}
export function stringToWasm(str) {
    const bytes = textEncoder.encode(str + '\0');
    const ptr = malloc(bytes.length);
    const memory = getMemory();
    const view = new Uint8Array(memory.buffer, ptr, bytes.length);
    view.set(bytes);
    return ptr;
}
const MAX_STRING_LENGTH = 1024 * 1024;
export function wasmToString(ptr, maxLength = MAX_STRING_LENGTH) {
    if (ptr === 0)
        return null;
    const memory = getMemory();
    const view = new Uint8Array(memory.buffer);
    const bufferEnd = view.length;
    let end = ptr;
    const limit = Math.min(ptr + maxLength, bufferEnd);
    while (end < limit && view[end] !== 0) {
        end++;
    }
    if (end >= limit && view[end] !== 0) {
        throw new Error(`wasmToString: string exceeds maximum length ${maxLength} or is not null-terminated`);
    }
    const bytes = view.slice(ptr, end);
    return textDecoder.decode(bytes);
}
export function wasmToStringAndFree(ptr) {
    const str = wasmToString(ptr);
    freeString(ptr);
    return str;
}
export function copyToWasm(data) {
    if (data.length === 0) {
        return 0;
    }
    const ptr = malloc(data.length);
    const memory = getMemory();
    const view = new Uint8Array(memory.buffer, ptr, data.length);
    view.set(data);
    return ptr;
}
export function copyFromWasm(ptr, length) {
    const memory = getMemory();
    const view = new Uint8Array(memory.buffer, ptr, length);
    return new Uint8Array(view);
}
export function allocOutPtr() {
    return malloc(4);
}
export function readOutPtr(outPtr) {
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    return view.getUint32(outPtr, true);
}
export function allocOutUsize() {
    return malloc(4);
}
export function readOutUsize(outPtr) {
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    return view.getUint32(outPtr, true);
}
export function readDouble(ptr) {
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    return view.getFloat64(ptr, true);
}
export function readFloat64Array(ptr, count) {
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    const result = new Float64Array(count);
    for (let i = 0; i < count; i++) {
        result[i] = view.getFloat64(ptr + i * 8, true);
    }
    return result;
}
export function readU16(ptr) {
    const memory = getMemory();
    const view = new Uint16Array(memory.buffer, ptr, 1);
    return view[0];
}
export function readU32(ptr) {
    const memory = getMemory();
    const view = new Uint32Array(memory.buffer, ptr, 1);
    return view[0];
}
//# sourceMappingURL=memory.js.map