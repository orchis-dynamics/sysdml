"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simlin_sim_new = simlin_sim_new;
exports.simlin_sim_ref = simlin_sim_ref;
exports.simlin_sim_unref = simlin_sim_unref;
exports.simlin_sim_run_to = simlin_sim_run_to;
exports.simlin_sim_run_to_end = simlin_sim_run_to_end;
exports.simlin_sim_reset = simlin_sim_reset;
exports.simlin_sim_get_stepcount = simlin_sim_get_stepcount;
exports.simlin_sim_get_value = simlin_sim_get_value;
exports.simlin_sim_set_value = simlin_sim_set_value;
exports.simlin_sim_get_series = simlin_sim_get_series;
exports.simlin_sim_set_value_by_offset = simlin_sim_set_value_by_offset;
exports.simlin_sim_get_offset = simlin_sim_get_offset;
exports.simlin_sim_get_var_count = simlin_sim_get_var_count;
exports.simlin_sim_get_var_names = simlin_sim_get_var_names;
const wasm_1 = require("@simlin/engine/internal/wasm");
const wasm_2 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
const error_1 = require("./error");
function simlin_sim_new(model, enableLtm) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_new;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(model, enableLtm ? 1 : 0, outErrPtr);
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
function simlin_sim_ref(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_ref;
    fn(sim);
}
function simlin_sim_unref(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_unref;
    fn(sim);
}
function simlin_sim_run_to(sim, time) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_run_to;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, time, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
    }
    finally {
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_run_to_end(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_run_to_end;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
    }
    finally {
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_reset(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_reset;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
    }
    finally {
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_get_stepcount(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_get_stepcount;
    const outCountPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, outCountPtr, outErrPtr);
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
        (0, memory_1.free)(outCountPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_get_value(sim, name) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_get_value;
    const namePtr = (0, memory_1.stringToWasm)(name);
    const outValPtr = (0, memory_1.malloc)(8);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, namePtr, outValPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        return (0, memory_1.readDouble)(outValPtr);
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outValPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_set_value(sim, name, value) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_set_value;
    const namePtr = (0, memory_1.stringToWasm)(name);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, namePtr, value, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_get_series(sim, name, stepCount) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_get_series;
    const namePtr = (0, memory_1.stringToWasm)(name);
    const resultsPtr = (0, memory_1.malloc)(stepCount * 8);
    const outWrittenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, namePtr, resultsPtr, stepCount, outWrittenPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        const written = (0, memory_1.readOutUsize)(outWrittenPtr);
        return (0, memory_1.readFloat64Array)(resultsPtr, written);
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(resultsPtr);
        (0, memory_1.free)(outWrittenPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_set_value_by_offset(sim, offset, value) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_set_value_by_offset;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, offset, value, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
    }
    finally {
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_get_offset(sim, name) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_get_offset;
    const namePtr = (0, memory_1.stringToWasm)(name);
    const outOffsetPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, namePtr, outOffsetPtr, outErrPtr);
        const errPtr = (0, memory_1.readOutPtr)(outErrPtr);
        if (errPtr !== 0) {
            const code = (0, error_1.simlin_error_get_code)(errPtr);
            const message = (0, error_1.simlin_error_get_message)(errPtr) ?? 'Unknown error';
            const details = (0, error_1.readAllErrorDetails)(errPtr);
            (0, error_1.simlin_error_free)(errPtr);
            throw new error_1.SimlinError(message, code, details);
        }
        return (0, memory_1.readOutUsize)(outOffsetPtr);
    }
    finally {
        (0, memory_1.free)(namePtr);
        (0, memory_1.free)(outOffsetPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_get_var_count(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_get_var_count;
    const outCountPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, outCountPtr, outErrPtr);
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
        (0, memory_1.free)(outCountPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_sim_get_var_names(sim) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_sim_get_var_names;
    const count = simlin_sim_get_var_count(sim);
    if (count === 0) {
        return [];
    }
    const resultPtr = (0, memory_1.malloc)(count * 4);
    const outWrittenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, resultPtr, count, outWrittenPtr, outErrPtr);
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
        const memory = (0, wasm_2.getMemory)();
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
//# sourceMappingURL=sim.js.map