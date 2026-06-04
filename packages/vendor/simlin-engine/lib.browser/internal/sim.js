import { getExports } from '@simlin/engine/internal/wasm';
import { getMemory } from '@simlin/engine/internal/wasm';
import { free, stringToWasm, wasmToStringAndFree, allocOutPtr, readOutPtr, allocOutUsize, readOutUsize, readDouble, readFloat64Array, malloc, } from './memory';
import { simlin_error_free, simlin_error_get_code, simlin_error_get_message, readAllErrorDetails, SimlinError, } from './error';
export function simlin_sim_new(model, enableLtm) {
    const exports = getExports();
    const fn = exports.simlin_sim_new;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(model, enableLtm ? 1 : 0, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        return result;
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_sim_ref(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_ref;
    fn(sim);
}
export function simlin_sim_unref(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_unref;
    fn(sim);
}
export function simlin_sim_run_to(sim, time) {
    const exports = getExports();
    const fn = exports.simlin_sim_run_to;
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, time, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_sim_run_to_end(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_run_to_end;
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_sim_reset(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_reset;
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_sim_get_stepcount(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_get_stepcount;
    const outCountPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, outCountPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        return readOutUsize(outCountPtr);
    }
    finally {
        free(outCountPtr);
        free(outErrPtr);
    }
}
export function simlin_sim_get_value(sim, name) {
    const exports = getExports();
    const fn = exports.simlin_sim_get_value;
    const namePtr = stringToWasm(name);
    const outValPtr = malloc(8);
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, namePtr, outValPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        return readDouble(outValPtr);
    }
    finally {
        free(namePtr);
        free(outValPtr);
        free(outErrPtr);
    }
}
export function simlin_sim_set_value(sim, name, value) {
    const exports = getExports();
    const fn = exports.simlin_sim_set_value;
    const namePtr = stringToWasm(name);
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, namePtr, value, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
    }
    finally {
        free(namePtr);
        free(outErrPtr);
    }
}
export function simlin_sim_get_series(sim, name, stepCount) {
    const exports = getExports();
    const fn = exports.simlin_sim_get_series;
    const namePtr = stringToWasm(name);
    const resultsPtr = malloc(stepCount * 8);
    const outWrittenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, namePtr, resultsPtr, stepCount, outWrittenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        const written = readOutUsize(outWrittenPtr);
        return readFloat64Array(resultsPtr, written);
    }
    finally {
        free(namePtr);
        free(resultsPtr);
        free(outWrittenPtr);
        free(outErrPtr);
    }
}
export function simlin_sim_set_value_by_offset(sim, offset, value) {
    const exports = getExports();
    const fn = exports.simlin_sim_set_value_by_offset;
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, offset, value, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_sim_get_offset(sim, name) {
    const exports = getExports();
    const fn = exports.simlin_sim_get_offset;
    const namePtr = stringToWasm(name);
    const outOffsetPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, namePtr, outOffsetPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        return readOutUsize(outOffsetPtr);
    }
    finally {
        free(namePtr);
        free(outOffsetPtr);
        free(outErrPtr);
    }
}
export function simlin_sim_get_var_count(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_get_var_count;
    const outCountPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, outCountPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        return readOutUsize(outCountPtr);
    }
    finally {
        free(outCountPtr);
        free(outErrPtr);
    }
}
export function simlin_sim_get_var_names(sim) {
    const exports = getExports();
    const fn = exports.simlin_sim_get_var_names;
    const count = simlin_sim_get_var_count(sim);
    if (count === 0) {
        return [];
    }
    const resultPtr = malloc(count * 4);
    const outWrittenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, resultPtr, count, outWrittenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        const written = readOutUsize(outWrittenPtr);
        const names = [];
        const memory = getMemory();
        const view = new DataView(memory.buffer);
        for (let i = 0; i < written; i++) {
            const strPtr = view.getUint32(resultPtr + i * 4, true);
            if (strPtr !== 0) {
                const name = wasmToStringAndFree(strPtr);
                if (name !== null) {
                    names.push(name);
                }
            }
        }
        return names;
    }
    finally {
        free(resultPtr);
        free(outWrittenPtr);
        free(outErrPtr);
    }
}
//# sourceMappingURL=sim.js.map