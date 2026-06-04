import { getExports, getMemory } from '@simlin/engine/internal/wasm';
import { malloc, free, stringToWasm, wasmToStringAndFree, copyFromWasm, allocOutPtr, readOutPtr, allocOutUsize, readOutUsize, } from './memory';
import { simlin_error_free, simlin_error_get_code, simlin_error_get_message, readAllErrorDetails, SimlinError, } from './error';
export function simlin_model_ref(model) {
    const exports = getExports();
    const fn = exports.simlin_model_ref;
    fn(model);
}
export function simlin_model_unref(model) {
    const exports = getExports();
    const fn = exports.simlin_model_unref;
    fn(model);
}
export function simlin_model_get_name(model) {
    const exports = getExports();
    const fn = exports.simlin_model_get_name;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(model, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        const name = wasmToStringAndFree(result);
        if (name === null) {
            throw new SimlinError('model name returned null pointer', 0);
        }
        return name;
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_model_get_var_count(model, typeMask = 0, filter = null) {
    const exports = getExports();
    const fn = exports.simlin_model_get_var_count;
    const outCountPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    const filterPtr = filter !== null ? stringToWasm(filter) : 0;
    try {
        fn(model, typeMask, filterPtr, outCountPtr, outErrPtr);
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
        if (filterPtr !== 0)
            free(filterPtr);
        free(outCountPtr);
        free(outErrPtr);
    }
}
export function simlin_model_get_latex_equation(model, ident) {
    const exports = getExports();
    const fn = exports.simlin_model_get_latex_equation;
    const identPtr = stringToWasm(ident);
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(model, identPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        if (result === 0) {
            return null;
        }
        return wasmToStringAndFree(result);
    }
    finally {
        free(identPtr);
        free(outErrPtr);
    }
}
export function simlin_model_get_links(model) {
    const exports = getExports();
    const fn = exports.simlin_model_get_links;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(model, outErrPtr);
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
export function simlin_model_get_var_names(model, typeMask = 0, filter = null) {
    const exports = getExports();
    const fn = exports.simlin_model_get_var_names;
    const count = simlin_model_get_var_count(model, typeMask, filter);
    if (count === 0) {
        return [];
    }
    const filterPtr = filter !== null ? stringToWasm(filter) : 0;
    const resultPtr = malloc(count * 4);
    const outWrittenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(model, typeMask, filterPtr, resultPtr, count, outWrittenPtr, outErrPtr);
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
        if (filterPtr !== 0)
            free(filterPtr);
        free(resultPtr);
        free(outWrittenPtr);
        free(outErrPtr);
    }
}
export function simlin_model_get_incoming_links(model, varName) {
    const exports = getExports();
    const fn = exports.simlin_model_get_incoming_links;
    const varNamePtr = stringToWasm(varName);
    const outCountPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(model, varNamePtr, 0, 0, outCountPtr, outErrPtr);
        let errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        const count = readOutUsize(outCountPtr);
        if (count === 0) {
            return [];
        }
        const resultPtr = malloc(count * 4);
        const outWrittenPtr = allocOutUsize();
        try {
            fn(model, varNamePtr, resultPtr, count, outWrittenPtr, outErrPtr);
            errPtr = readOutPtr(outErrPtr);
            if (errPtr !== 0) {
                const code = simlin_error_get_code(errPtr);
                const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
                simlin_error_free(errPtr);
                throw new SimlinError(message, code);
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
        }
    }
    finally {
        free(varNamePtr);
        free(outCountPtr);
        free(outErrPtr);
    }
}
function callBufferReturningFn(invoke) {
    const outBufPtr = allocOutPtr();
    const outLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        invoke(outBufPtr, outLenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            throw new SimlinError(message, code, details);
        }
        const bufPtr = readOutPtr(outBufPtr);
        const len = readOutUsize(outLenPtr);
        const data = copyFromWasm(bufPtr, len);
        free(bufPtr);
        return data;
    }
    finally {
        free(outBufPtr);
        free(outLenPtr);
        free(outErrPtr);
    }
}
export function simlin_model_get_var_json(model, varName) {
    const exports = getExports();
    const fn = exports.simlin_model_get_var_json;
    const varNamePtr = stringToWasm(varName);
    try {
        return callBufferReturningFn((outBuf, outLen, outErr) => fn(model, varNamePtr, outBuf, outLen, outErr));
    }
    finally {
        free(varNamePtr);
    }
}
export function simlin_model_get_sim_specs_json(model) {
    const fn = getExports().simlin_model_get_sim_specs_json;
    return callBufferReturningFn((outBuf, outLen, outErr) => fn(model, outBuf, outLen, outErr));
}
//# sourceMappingURL=model.js.map