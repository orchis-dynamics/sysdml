import { getExports, getMemory } from '@simlin/engine/internal/wasm';
import { malloc, free, stringToWasm, wasmToStringAndFree, copyToWasm, copyFromWasm, allocOutPtr, readOutPtr, allocOutUsize, readOutUsize, } from './memory';
import { simlin_error_free, simlin_error_get_code, simlin_error_get_message, SimlinError, readAllErrorDetails, } from './error';
export function simlin_project_open_protobuf(data) {
    const exports = getExports();
    const fn = exports.simlin_project_open_protobuf;
    const dataPtr = copyToWasm(data);
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(dataPtr, data.length, outErrPtr);
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
        free(dataPtr);
        free(outErrPtr);
    }
}
export function simlin_project_open_json(data, format) {
    const exports = getExports();
    const fn = exports.simlin_project_open_json;
    const dataPtr = copyToWasm(data);
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(dataPtr, data.length, format, outErrPtr);
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
        free(dataPtr);
        free(outErrPtr);
    }
}
export function simlin_project_ref(project) {
    const exports = getExports();
    const fn = exports.simlin_project_ref;
    fn(project);
}
export function simlin_project_unref(project) {
    const exports = getExports();
    const fn = exports.simlin_project_unref;
    fn(project);
}
export function simlin_project_get_model_count(project) {
    const exports = getExports();
    const fn = exports.simlin_project_get_model_count;
    const outCountPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(project, outCountPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            simlin_error_free(errPtr);
            throw new SimlinError(message, code);
        }
        return readOutUsize(outCountPtr);
    }
    finally {
        free(outCountPtr);
        free(outErrPtr);
    }
}
export function simlin_project_get_model_names(project) {
    const exports = getExports();
    const fn = exports.simlin_project_get_model_names;
    const count = simlin_project_get_model_count(project);
    if (count === 0) {
        return [];
    }
    const resultPtr = malloc(count * 4);
    const outWrittenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(project, resultPtr, count, outWrittenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
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
        free(outErrPtr);
    }
}
export function simlin_project_get_model(project, modelName) {
    const exports = getExports();
    const fn = exports.simlin_project_get_model;
    const namePtr = modelName !== null ? stringToWasm(modelName) : 0;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(project, namePtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            simlin_error_free(errPtr);
            throw new SimlinError(message, code);
        }
        return result;
    }
    finally {
        if (namePtr !== 0)
            free(namePtr);
        free(outErrPtr);
    }
}
export function simlin_project_serialize_protobuf(project) {
    const exports = getExports();
    const fn = exports.simlin_project_serialize_protobuf;
    const outBufPtr = allocOutPtr();
    const outLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(project, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            simlin_error_free(errPtr);
            throw new SimlinError(message, code);
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
export function simlin_project_serialize_json(project, format, includeStdlib = false) {
    const exports = getExports();
    const fn = exports.simlin_project_serialize_json;
    const outBufPtr = allocOutPtr();
    const outLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(project, format, includeStdlib ? 1 : 0, outBufPtr, outLenPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            simlin_error_free(errPtr);
            throw new SimlinError(message, code);
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
export function simlin_project_is_simulatable(project, modelName) {
    const exports = getExports();
    const fn = exports.simlin_project_is_simulatable;
    const namePtr = modelName !== null ? stringToWasm(modelName) : 0;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(project, namePtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            simlin_error_free(errPtr);
            return false;
        }
        return result !== 0;
    }
    finally {
        if (namePtr !== 0)
            free(namePtr);
        free(outErrPtr);
    }
}
export function simlin_project_get_errors(project) {
    const exports = getExports();
    const fn = exports.simlin_project_get_errors;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(project, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            simlin_error_free(errPtr);
            throw new SimlinError(message, code);
        }
        return result;
    }
    finally {
        free(outErrPtr);
    }
}
export function simlin_project_add_model(project, modelName) {
    const exports = getExports();
    const fn = exports.simlin_project_add_model;
    const namePtr = stringToWasm(modelName);
    const outErrPtr = allocOutPtr();
    try {
        fn(project, namePtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            simlin_error_free(errPtr);
            throw new SimlinError(message, code);
        }
    }
    finally {
        free(namePtr);
        free(outErrPtr);
    }
}
export function simlin_project_apply_patch(project, patchData, dryRun, allowErrors) {
    const exports = getExports();
    const fn = exports.simlin_project_apply_patch;
    const dataPtr = copyToWasm(patchData);
    const outCollectedPtr = allocOutPtr();
    const outErrPtr = allocOutPtr();
    try {
        fn(project, dataPtr, patchData.length, dryRun ? 1 : 0, allowErrors ? 1 : 0, outCollectedPtr, outErrPtr);
        const errPtr = readOutPtr(outErrPtr);
        if (errPtr !== 0) {
            const code = simlin_error_get_code(errPtr);
            const message = simlin_error_get_message(errPtr) ?? 'Unknown error';
            const details = readAllErrorDetails(errPtr);
            simlin_error_free(errPtr);
            const collectedPtr = readOutPtr(outCollectedPtr);
            if (collectedPtr !== 0) {
                const collectedDetails = readAllErrorDetails(collectedPtr);
                details.push(...collectedDetails);
                simlin_error_free(collectedPtr);
            }
            throw new SimlinError(message, code, details);
        }
        return readOutPtr(outCollectedPtr);
    }
    finally {
        free(dataPtr);
        free(outCollectedPtr);
        free(outErrPtr);
    }
}
//# sourceMappingURL=project.js.map