"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simlin_model_ref = simlin_model_ref;
exports.simlin_model_unref = simlin_model_unref;
exports.simlin_model_get_name = simlin_model_get_name;
exports.simlin_model_get_var_count = simlin_model_get_var_count;
exports.simlin_model_get_latex_equation = simlin_model_get_latex_equation;
exports.simlin_model_get_links = simlin_model_get_links;
exports.simlin_model_get_var_names = simlin_model_get_var_names;
exports.simlin_model_get_incoming_links = simlin_model_get_incoming_links;
exports.simlin_model_get_var_json = simlin_model_get_var_json;
exports.simlin_model_get_sim_specs_json = simlin_model_get_sim_specs_json;
const wasm_1 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
const error_1 = require("./error");
function simlin_model_ref(model) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_ref;
    fn(model);
}
function simlin_model_unref(model) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_unref;
    fn(model);
}
function simlin_model_get_name(model) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_name;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(model, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const name = (0, memory_1.wasmToStringAndFree)(result);
        if (name === null) {
            throw new error_1.SimlinError('model name returned null pointer', 0);
        }
        return name;
    }
    finally {
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_model_get_var_count(model, typeMask = 0, filter = null) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_var_count;
    const outCountPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    const filterPtr = filter !== null ? (0, memory_1.stringToWasm)(filter) : 0;
    try {
        fn(model, typeMask, filterPtr, outCountPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        return (0, memory_1.readOutUsize)(outCountPtr);
    }
    finally {
        if (filterPtr !== 0)
            (0, memory_1.free)(filterPtr);
        (0, memory_1.free)(outCountPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_model_get_latex_equation(model, ident) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_latex_equation;
    const identPtr = (0, memory_1.stringToWasm)(ident);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(model, identPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        if (result === 0) {
            return null;
        }
        return (0, memory_1.wasmToStringAndFree)(result);
    }
    finally {
        (0, memory_1.free)(identPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_model_get_links(model) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_links;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(model, outErrPtr);
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
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_model_get_var_names(model, typeMask = 0, filter = null) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_var_names;
    const count = simlin_model_get_var_count(model, typeMask, filter);
    if (count === 0) {
        return [];
    }
    const filterPtr = filter !== null ? (0, memory_1.stringToWasm)(filter) : 0;
    const resultPtr = (0, memory_1.malloc)(count * 4);
    const outWrittenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(model, typeMask, filterPtr, resultPtr, count, outWrittenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const written = (0, memory_1.readOutUsize)(outWrittenPtr);
        const names = [];
        const memory = (0, wasm_1.getMemory)();
        const view = new DataView(memory.buffer);
        for (let i = 0; i < written; i++) {
            const strPtr = view.getUint32(resultPtr + i * 4, true);
            if (strPtr !== 0) {
                const name = (0, memory_1.wasmToStringAndFree)(strPtr);
                if (name !== null) {
                    names.push(name);
                }
            }
        }
        return names;
    }
    finally {
        if (filterPtr !== 0)
            (0, memory_1.free)(filterPtr);
        (0, memory_1.free)(resultPtr);
        (0, memory_1.free)(outWrittenPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_model_get_incoming_links(model, varName) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_incoming_links;
    const varNamePtr = (0, memory_1.stringToWasm)(varName);
    const outCountPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(model, varNamePtr, 0, 0, outCountPtr, outErrPtr);
        let errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const count = (0, memory_1.readOutUsize)(outCountPtr);
        if (count === 0) {
            return [];
        }
        const resultPtr = (0, memory_1.malloc)(count * 4);
        const outWrittenPtr = (0, memory_1.allocOutUsize)();
        try {
            fn(model, varNamePtr, resultPtr, count, outWrittenPtr, outErrPtr);
            errPtr = (0, memory_1.readOutPtr)(outErrPtr);
            if (errPtr !== 0) {
                const code = (0, error_1.simlin_error_get_code)(errPtr);
                const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
                (0, error_1.simlin_error_free)(errPtr);
                throw new error_1.SimlinError(message, code);
            }
            const written = (0, memory_1.readOutUsize)(outWrittenPtr);
            const names = [];
            const memory = (0, wasm_1.getMemory)();
            const view = new DataView(memory.buffer);
            for (let i = 0; i < written; i++) {
                const strPtr = view.getUint32(resultPtr + i * 4, true);
                if (strPtr !== 0) {
                    const name = (0, memory_1.wasmToStringAndFree)(strPtr);
                    if (name !== null) {
                        names.push(name);
                    }
                }
            }
            return names;
        }
        finally {
            (0, memory_1.free)(resultPtr);
            (0, memory_1.free)(outWrittenPtr);
        }
    }
    finally {
        (0, memory_1.free)(varNamePtr);
        (0, memory_1.free)(outCountPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function callBufferReturningFn(invoke) {
    const outBufPtr = (0, memory_1.allocOutPtr)();
    const outLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        invoke(outBufPtr, outLenPtr, outErrPtr);
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
function simlin_model_get_var_json(model, varName) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_model_get_var_json;
    const varNamePtr = (0, memory_1.stringToWasm)(varName);
    try {
        return callBufferReturningFn((outBuf, outLen, outErr) => fn(model, varNamePtr, outBuf, outLen, outErr));
    }
    finally {
        (0, memory_1.free)(varNamePtr);
    }
}
function simlin_model_get_sim_specs_json(model) {
    const fn = (0, wasm_1.getExports)().simlin_model_get_sim_specs_json;
    return callBufferReturningFn((outBuf, outLen, outErr) => fn(model, outBuf, outLen, outErr));
}
//# sourceMappingURL=model.js.map