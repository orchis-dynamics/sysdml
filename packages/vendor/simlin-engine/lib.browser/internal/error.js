import { getExports, getMemory } from '@simlin/engine/internal/wasm';
import { wasmToString } from './memory';
export function simlin_error_str(code) {
    const exports = getExports();
    const fn = exports.simlin_error_str;
    const ptr = fn(code);
    return wasmToString(ptr) ?? `Unknown error ${code}`;
}
export function simlin_error_free(err) {
    if (err === 0)
        return;
    const exports = getExports();
    const fn = exports.simlin_error_free;
    fn(err);
}
export function simlin_error_get_code(err) {
    const exports = getExports();
    const fn = exports.simlin_error_get_code;
    return fn(err);
}
export function simlin_error_get_message(err) {
    const exports = getExports();
    const fn = exports.simlin_error_get_message;
    const ptr = fn(err);
    return wasmToString(ptr);
}
export function simlin_error_get_detail_count(err) {
    const exports = getExports();
    const fn = exports.simlin_error_get_detail_count;
    return fn(err);
}
export function simlin_error_get_details(err) {
    const exports = getExports();
    const fn = exports.simlin_error_get_details;
    return fn(err);
}
export function simlin_error_get_detail(err, index) {
    const exports = getExports();
    const fn = exports.simlin_error_get_detail;
    return fn(err, index);
}
export function readErrorDetail(ptr) {
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    const code = view.getUint32(ptr, true);
    const messagePtr = view.getUint32(ptr + 4, true);
    const modelNamePtr = view.getUint32(ptr + 8, true);
    const variableNamePtr = view.getUint32(ptr + 12, true);
    const startOffset = view.getUint16(ptr + 16, true);
    const endOffset = view.getUint16(ptr + 18, true);
    const kind = view.getUint32(ptr + 20, true);
    const unitErrorKind = view.getUint32(ptr + 24, true);
    const severity = view.getUint32(ptr + 28, true);
    const detailsPtr = view.getUint32(ptr + 32, true);
    return {
        code,
        message: wasmToString(messagePtr),
        modelName: wasmToString(modelNamePtr),
        variableName: wasmToString(variableNamePtr),
        startOffset,
        endOffset,
        kind,
        unitErrorKind,
        severity,
        details: wasmToString(detailsPtr),
    };
}
export function readAllErrorDetails(err) {
    if (err === 0)
        return [];
    const count = simlin_error_get_detail_count(err);
    const details = [];
    for (let i = 0; i < count; i++) {
        const detailPtr = simlin_error_get_detail(err, i);
        if (detailPtr !== 0) {
            details.push(readErrorDetail(detailPtr));
        }
    }
    return details;
}
export class SimlinError extends Error {
    constructor(message, code, details = []) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SimlinError';
    }
}
//# sourceMappingURL=error.js.map