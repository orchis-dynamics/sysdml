import { getExports } from '@simlin/engine/internal/wasm';
import { free, copyFromWasm, allocOutPtr, readOutPtr, allocOutUsize, readOutUsize } from './memory';
import { simlin_error_free, simlin_error_get_code, simlin_error_get_message, readAllErrorDetails, SimlinError, } from './error';
const textDecoder = new TextDecoder();
export function simlin_model_compile_to_wasm(model, enableLtm) {
    const fn = getExports().simlin_model_compile_to_wasm;
    const outWasmPtr = allocOutPtr();
    const outWasmLenPtr = allocOutUsize();
    const outLayoutPtr = allocOutPtr();
    const outLayoutLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(model, enableLtm ? 1 : 0, 0, outWasmPtr, outWasmLenPtr, outLayoutPtr, outLayoutLenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        const wasmPtr = readOutPtr(outWasmPtr);
        const wasmLen = readOutUsize(outWasmLenPtr);
        const wasm = copyFromWasm(wasmPtr, wasmLen);
        free(wasmPtr);
        const layoutPtr = readOutPtr(outLayoutPtr);
        const layoutLen = readOutUsize(outLayoutLenPtr);
        const layout = copyFromWasm(layoutPtr, layoutLen);
        free(layoutPtr);
        return { wasm, layout };
    }
    finally {
        free(outWasmPtr);
        free(outWasmLenPtr);
        free(outLayoutPtr);
        free(outLayoutLenPtr);
        free(outErrPtr);
    }
}
export function parseWasmLayout(bytes) {
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
export function readStridedSeries(memory, layout, slot, count = layout.nChunks) {
    const rows = Math.max(0, Math.min(count, layout.nChunks));
    const view = new DataView(memory);
    const series = new Float64Array(rows);
    for (let c = 0; c < rows; c++) {
        series[c] = view.getFloat64(layout.resultsOffset + (c * layout.nSlots + slot) * 8, true);
    }
    return series;
}
//# sourceMappingURL=wasmgen.js.map