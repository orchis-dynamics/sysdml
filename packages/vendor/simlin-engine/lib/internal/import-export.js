"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simlin_project_open_xmile = simlin_project_open_xmile;
exports.simlin_project_open_vensim = simlin_project_open_vensim;
exports.simlin_project_serialize_xmile = simlin_project_serialize_xmile;
exports.simlin_project_render_svg = simlin_project_render_svg;
exports.simlin_project_render_png = simlin_project_render_png;
const wasm_1 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
const error_1 = require("./error");
function simlin_project_open_xmile(data) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_open_xmile;
    const dataPtr = (0, memory_1.copyToWasm)(data);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(dataPtr, data.length, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        return result;
    }
    finally {
        (0, memory_1.free)(dataPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_open_vensim(data) {
    const exports = (0, wasm_1.getExports)();
    const importFn = exports.simlin_project_open_vensim;
    const dataPtr = (0, memory_1.copyToWasm)(data);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = importFn(dataPtr, data.length, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        return result;
    }
    finally {
        (0, memory_1.free)(dataPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_serialize_xmile(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_serialize_xmile;
    const outBufPtr = (0, memory_1.allocOutPtr)();
    const outLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const bufPtr = (0, memory_1.readOutPtr)(outBufPtr);
        const len = (0, memory_1.readOutUsize)(outLenPtr);
        const data = (0, memory_1.copyFromWasm)(bufPtr, len);
        (0, memory_1.free)(bufPtr);
        return data;
    }
    finally {
        (0, memory_1.free)(outBufPtr);
        (0, memory_1.free)(outLenPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_render_svg(project, modelName) {
    const exports = (0, wasm_1.getExports)();
    const renderFn = exports.simlin_project_render_svg;
    const namePtr = (0, memory_1.stringToWasm)(modelName);
    const outBufPtr = (0, memory_1.allocOutPtr)();
    const outLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        renderFn(project, namePtr, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const bufPtr = (0, memory_1.readOutPtr)(outBufPtr);
        const len = (0, memory_1.readOutUsize)(outLenPtr);
        const data = (0, memory_1.copyFromWasm)(bufPtr, len);
        (0, memory_1.free)(bufPtr);
        return data;
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outBufPtr);
        (0, memory_1.free)(outLenPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_render_png(project, modelName, width, height) {
    const exports = (0, wasm_1.getExports)();
    const renderFn = exports.simlin_project_render_png;
    if (typeof renderFn !== 'function') {
        throw new Error('PNG rendering is not available in this build of libsimlin (browser builds omit png_render)');
    }
    const namePtr = (0, memory_1.stringToWasm)(modelName);
    const outBufPtr = (0, memory_1.allocOutPtr)();
    const outLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        renderFn(project, namePtr, width, height, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const bufPtr = (0, memory_1.readOutPtr)(outBufPtr);
        const len = (0, memory_1.readOutUsize)(outLenPtr);
        const data = (0, memory_1.copyFromWasm)(bufPtr, len);
        (0, memory_1.free)(bufPtr);
        return data;
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outBufPtr);
        (0, memory_1.free)(outLenPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
//# sourceMappingURL=import-export.js.map