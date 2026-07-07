import { getExports } from '@simlin/engine/internal/wasm';
import { free, copyToWasm, copyFromWasm, allocOutPtr, readOutPtr, allocOutUsize, readOutUsize, stringToWasm, } from './memory';
import { simlin_error_free, simlin_error_get_code, simlin_error_get_message, readAllErrorDetails, SimlinError, } from './error';
export function simlin_project_open_xmile(data) {
    const exports = getExports();
    const fn = exports.simlin_project_open_xmile;
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
export function simlin_project_open_vensim(data) {
    const exports = getExports();
    const importFn = exports.simlin_project_open_vensim;
    const dataPtr = copyToWasm(data);
    const outErrPtr = allocOutPtr();
    try {
        const result = importFn(dataPtr, data.length, outErrPtr);
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
export function simlin_project_serialize_xmile(project) {
    const exports = getExports();
    const fn = exports.simlin_project_serialize_xmile;
    const outBufPtr = allocOutPtr();
    const outLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(project, outBufPtr, outLenPtr, outErrPtr);
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
export function simlin_project_render_svg(project, modelName) {
    const exports = getExports();
    const renderFn = exports.simlin_project_render_svg;
    const namePtr = stringToWasm(modelName);
    const outBufPtr = allocOutPtr();
    const outLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        renderFn(project, namePtr, outBufPtr, outLenPtr, outErrPtr);
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
        free(namePtr);
        free(outBufPtr);
        free(outLenPtr);
        free(outErrPtr);
    }
}
export function simlin_project_render_png(project, modelName, width, height) {
    const exports = getExports();
    const renderFn = exports.simlin_project_render_png;
    if (typeof renderFn !== 'function') {
        throw new Error('PNG rendering is not available in this build of libsimlin (browser builds omit png_render)');
    }
    const namePtr = stringToWasm(modelName);
    const outBufPtr = allocOutPtr();
    const outLenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        renderFn(project, namePtr, width, height, outBufPtr, outLenPtr, outErrPtr);
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
        free(namePtr);
        free(outBufPtr);
        free(outLenPtr);
        free(outErrPtr);
    }
}
//# sourceMappingURL=import-export.js.map