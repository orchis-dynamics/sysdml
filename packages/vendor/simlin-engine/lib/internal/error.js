"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimlinError = void 0;
exports.simlin_error_str = simlin_error_str;
exports.simlin_error_free = simlin_error_free;
exports.simlin_error_get_code = simlin_error_get_code;
exports.simlin_error_get_message = simlin_error_get_message;
exports.simlin_error_get_detail_count = simlin_error_get_detail_count;
exports.simlin_error_get_details = simlin_error_get_details;
exports.simlin_error_get_detail = simlin_error_get_detail;
exports.readErrorDetail = readErrorDetail;
exports.readAllErrorDetails = readAllErrorDetails;
const wasm_1 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
function simlin_error_str(code) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_str;
    const ptr = fn(code);
    return (0, memory_1.wasmToString)(ptr) ?? `Unknown error ${code}`;
}
function simlin_error_free(err) {
    if (err === 0)
        return;
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_free;
    fn(err);
}
function simlin_error_get_code(err) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_get_code;
    return fn(err);
}
function simlin_error_get_message(err) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_get_message;
    const ptr = fn(err);
    return (0, memory_1.wasmToString)(ptr);
}
function simlin_error_get_detail_count(err) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_get_detail_count;
    return fn(err);
}
function simlin_error_get_details(err) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_get_details;
    return fn(err);
}
function simlin_error_get_detail(err, index) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_error_get_detail;
    return fn(err, index);
}
function readErrorDetail(ptr) {
    const memory = (0, wasm_1.getMemory)();
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
        message: (0, memory_1.wasmToString)(messagePtr),
        modelName: (0, memory_1.wasmToString)(modelNamePtr),
        variableName: (0, memory_1.wasmToString)(variableNamePtr),
        startOffset,
        endOffset,
        kind,
        unitErrorKind,
        severity,
        details: (0, memory_1.wasmToString)(detailsPtr),
    };
}
function readAllErrorDetails(err) {
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
class SimlinError extends Error {
    constructor(message, code, details = []) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SimlinError';
    }
}
exports.SimlinError = SimlinError;
//# sourceMappingURL=error.js.map