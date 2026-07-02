"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simlin_project_open_protobuf = simlin_project_open_protobuf;
exports.simlin_project_open_json = simlin_project_open_json;
exports.simlin_project_ref = simlin_project_ref;
exports.simlin_project_unref = simlin_project_unref;
exports.simlin_project_get_model_count = simlin_project_get_model_count;
exports.simlin_project_get_model_names = simlin_project_get_model_names;
exports.simlin_project_get_model = simlin_project_get_model;
exports.simlin_project_serialize_protobuf = simlin_project_serialize_protobuf;
exports.simlin_project_serialize_json = simlin_project_serialize_json;
exports.simlin_project_is_simulatable = simlin_project_is_simulatable;
exports.simlin_project_get_errors = simlin_project_get_errors;
exports.simlin_project_add_model = simlin_project_add_model;
exports.simlin_project_apply_patch = simlin_project_apply_patch;
const wasm_1 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
const error_1 = require("./error");
function simlin_project_open_protobuf(data) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_open_protobuf;
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
function simlin_project_open_json(data, format) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_open_json;
    const dataPtr = (0, memory_1.copyToWasm)(data);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(dataPtr, data.length, format, outErrPtr);
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
function simlin_project_ref(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_ref;
    fn(project);
}
function simlin_project_unref(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_unref;
    fn(project);
}
function simlin_project_get_model_count(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_get_model_count;
    const outCountPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, outCountPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code);
        }
        return (0, memory_1.readOutUsize)(outCountPtr);
    }
    finally {
        (0, memory_1.free)(outCountPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_get_model_names(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_get_model_names;
    const count = simlin_project_get_model_count(project);
    if (count === 0) {
        return [];
    }
    const resultPtr = (0, memory_1.malloc)(count * 4);
    const outWrittenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, resultPtr, count, outWrittenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
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
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_get_model(project, modelName) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_get_model;
    const namePtr = modelName !== null ? (0, memory_1.stringToWasm)(modelName) : 0;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(project, namePtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code);
        }
        return result;
    }
    finally {
        if (namePtr !== 0)
            (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_serialize_protobuf(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_serialize_protobuf;
    const outBufPtr = (0, memory_1.allocOutPtr)();
    const outLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code);
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
function simlin_project_serialize_json(project, format, includeStdlib = false) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_serialize_json;
    const outBufPtr = (0, memory_1.allocOutPtr)();
    const outLenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, format, includeStdlib ? 1 : 0, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code);
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
function simlin_project_is_simulatable(project, modelName) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_is_simulatable;
    const namePtr = modelName !== null ? (0, memory_1.stringToWasm)(modelName) : 0;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(project, namePtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            (0, error_1.simlin_error_free)(errPtr);
            return false;
        }
        return result !== 0;
    }
    finally {
        if (namePtr !== 0)
            (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_get_errors(project) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_get_errors;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(project, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code);
        }
        return result;
    }
    finally {
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_add_model(project, modelName) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_add_model;
    const namePtr = (0, memory_1.stringToWasm)(modelName);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, namePtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code);
        }
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_project_apply_patch(project, patchData, dryRun, allowErrors) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_project_apply_patch;
    const dataPtr = (0, memory_1.copyToWasm)(patchData);
    const outCollectedPtr = (0, memory_1.allocOutPtr)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(project, dataPtr, patchData.length, dryRun ? 1 : 0, allowErrors ? 1 : 0, outCollectedPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            const collectedPtr = (0, memory_1.readOutPtr)(outCollectedPtr);
            if (collectedPtr !== 0) {
                const collectedDetails = (0, error_1.readAllErrorDetails)(collectedPtr);
                details.push(...collectedDetails);
                (0, error_1.simlin_error_free)(collectedPtr);
            }
            throw new error_1.SimlinError(message, code, details);
        }
        return (0, memory_1.readOutPtr)(outCollectedPtr);
    }
    finally {
        (0, memory_1.free)(dataPtr);
        (0, memory_1.free)(outCollectedPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
//# sourceMappingURL=project.js.map