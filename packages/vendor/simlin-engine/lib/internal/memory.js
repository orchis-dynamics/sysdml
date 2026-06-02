"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.malloc = malloc;
exports.free = free;
exports.freeString = freeString;
exports.stringToWasm = stringToWasm;
exports.wasmToString = wasmToString;
exports.wasmToStringAndFree = wasmToStringAndFree;
exports.copyToWasm = copyToWasm;
exports.copyFromWasm = copyFromWasm;
exports.allocOutPtr = allocOutPtr;
exports.readOutPtr = readOutPtr;
exports.allocOutUsize = allocOutUsize;
exports.readOutUsize = readOutUsize;
exports.readDouble = readDouble;
exports.readFloat64Array = readFloat64Array;
exports.readU16 = readU16;
exports.readU32 = readU32;
const wasm_1 = require("@simlin/engine/internal/wasm");
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function malloc(size) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_malloc;
    const ptr = fn(size);
    if (ptr === 0 && size !== 0) {
        throw new Error('WASM allocation failed');
    }
    return ptr;
}
function free(ptr) {
    if (ptr === 0)
        return;
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_free;
    fn(ptr);
}
function freeString(ptr) {
    if (ptr === 0)
        return;
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_free_string;
    fn(ptr);
}
function stringToWasm(str) {
    const bytes = textEncoder.encode(str + '\0');
    const ptr = malloc(bytes.length);
    const memory = (0, wasm_1.getMemory)();
    const view = new Uint8Array(memory.buffer, ptr, bytes.length);
    view.set(bytes);
    return ptr;
}
const MAX_STRING_LENGTH = 1024 * 1024;
function wasmToString(ptr, maxLength = MAX_STRING_LENGTH) {
    if (ptr === 0)
        return null;
    const memory = (0, wasm_1.getMemory)();
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
function wasmToStringAndFree(ptr) {
    const str = wasmToString(ptr);
    freeString(ptr);
    return str;
}
function copyToWasm(data) {
    if (data.length === 0) {
        return 0;
    }
    const ptr = malloc(data.length);
    const memory = (0, wasm_1.getMemory)();
    const view = new Uint8Array(memory.buffer, ptr, data.length);
    view.set(data);
    return ptr;
}
function copyFromWasm(ptr, length) {
    const memory = (0, wasm_1.getMemory)();
    const view = new Uint8Array(memory.buffer, ptr, length);
    return new Uint8Array(view);
}
function allocOutPtr() {
    return malloc(4);
}
function readOutPtr(outPtr) {
    const memory = (0, wasm_1.getMemory)();
    const view = new DataView(memory.buffer);
    return view.getUint32(outPtr, true);
}
function allocOutUsize() {
    return malloc(4);
}
function readOutUsize(outPtr) {
    const memory = (0, wasm_1.getMemory)();
    const view = new DataView(memory.buffer);
    return view.getUint32(outPtr, true);
}
function readDouble(ptr) {
    const memory = (0, wasm_1.getMemory)();
    const view = new DataView(memory.buffer);
    return view.getFloat64(ptr, true);
}
function readFloat64Array(ptr, count) {
    const memory = (0, wasm_1.getMemory)();
    const view = new DataView(memory.buffer);
    const result = new Float64Array(count);
    for (let i = 0; i < count; i++) {
        result[i] = view.getFloat64(ptr + i * 8, true);
    }
    return result;
}
function readU16(ptr) {
    const memory = (0, wasm_1.getMemory)();
    const view = new Uint16Array(memory.buffer, ptr, 1);
    return view[0];
}
function readU32(ptr) {
    const memory = (0, wasm_1.getMemory)();
    const view = new Uint32Array(memory.buffer, ptr, 1);
    return view[0];
}
//# sourceMappingURL=memory.js.map