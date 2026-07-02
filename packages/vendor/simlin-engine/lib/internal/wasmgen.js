"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simlin_model_compile_to_wasm = simlin_model_compile_to_wasm;
exports.parseWasmLayout = parseWasmLayout;
exports.readStridedSeries = readStridedSeries;
const wasm_1 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
const error_1 = require("./error");
const textDecoder = new TextDecoder();
function simlin_model_compile_to_wasm(model, enableLtm) {
    const fn = (0, wasm_1.getExports)().simlin_model_compile_to_wasm;
    const outWasmPtr = (0, memory_1.allocOutPtr)();
    const outWasmLenPtr = (0, memory_1.allocOutUsize)();
    const outLayoutPtr = (0, memory_1.allocOutPtr)();
    const outLayoutLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(model, enableLtm ? 1 : 0, 0, outWasmPtr, outWasmLenPtr, outLayoutPtr, outLayoutLenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const wasmPtr = (0, memory_1.readOutPtr)(outWasmPtr);
        const wasmLen = (0, memory_1.readOutUsize)(outWasmLenPtr);
        const wasm = (0, memory_1.copyFromWasm)(wasmPtr, wasmLen);
        (0, memory_1.free)(wasmPtr);
        const layoutPtr = (0, memory_1.readOutPtr)(outLayoutPtr);
        const layoutLen = (0, memory_1.readOutUsize)(outLayoutLenPtr);
        const layout = (0, memory_1.copyFromWasm)(layoutPtr, layoutLen);
        (0, memory_1.free)(layoutPtr);
        return { wasm, layout };
    }
    finally {
        (0, memory_1.free)(outWasmPtr);
        (0, memory_1.free)(outWasmLenPtr);
        (0, memory_1.free)(outLayoutPtr);
        (0, memory_1.free)(outLayoutLenPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function parseWasmLayout(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let p = 0;
    const readU64 = () => {
        const value = Number(view.getBigUint64(p, true));
        p += 8;
        return value;
    };
    const readU32 = () => {
        const value = view.getUint32(p, true);
        p += 4;
        return value;
    };
    const nSlots = readU64();
    const nChunks = readU64();
    const resultsOffset = readU64();
    const count = readU32();
    const varOffsets = new Map();
    for (let i = 0; i < count; i++) {
        const nameLen = readU32();
        const name = textDecoder.decode(bytes.subarray(p, p + nameLen));
        p += nameLen;
        const offset = readU64();
        varOffsets.set(name, offset);
    }
    return { nSlots, nChunks, resultsOffset, varOffsets };
}
function readStridedSeries(memory, layout, slot, count = layout.nChunks) {
    const rows = Math.max(0, Math.min(count, layout.nChunks));
    const view = new DataView(memory);
    const series = new Float64Array(rows);
    for (let c = 0; c < rows; c++) {
        series[c] = view.getFloat64(layout.resultsOffset + (c * layout.nSlots + slot) * 8, true);
    }
    return series;
}
//# sourceMappingURL=wasmgen.js.map