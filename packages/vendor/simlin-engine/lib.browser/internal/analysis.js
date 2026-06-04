import { getExports, getMemory } from '@simlin/engine/internal/wasm';
import { free, stringToWasm, wasmToString, allocOutPtr, readOutPtr, allocOutUsize, readOutUsize, readFloat64Array, malloc, copyToWasm, } from './memory';
import { simlin_error_free, simlin_error_get_code, simlin_error_get_message, readAllErrorDetails, SimlinError, } from './error';
export function simlin_analyze_get_loops(model) {
    const exports = getExports();
    const fn = exports.simlin_analyze_get_loops;
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
export function simlin_free_loops(loops) {
    if (loops === 0)
        return;
    const exports = getExports();
    const fn = exports.simlin_free_loops;
    fn(loops);
}
export function simlin_analyze_get_links(sim, includeInternal = true) {
    const exports = getExports();
    const fn = exports.simlin_analyze_get_links;
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(sim, includeInternal ? 1 : 0, outErrPtr);
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
export function simlin_analyze_links_from_wasm_results(model, slab, layoutBytes, includeInternal = true) {
    const exports = getExports();
    const fn = exports.simlin_analyze_links_from_wasm_results;
    const slabPtr = copyToWasm(slab);
    const layoutPtr = copyToWasm(layoutBytes);
    const outErrPtr = allocOutPtr();
    try {
        const result = fn(model, slabPtr, slab.length, layoutPtr, layoutBytes.length, includeInternal ? 1 : 0, outErrPtr);
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
        free(slabPtr);
        free(layoutPtr);
        free(outErrPtr);
    }
}
export function simlin_free_links(links) {
    if (links === 0)
        return;
    const exports = getExports();
    const fn = exports.simlin_free_links;
    fn(links);
}
export function simlin_analyze_get_relative_loop_score(sim, loopId, stepCount) {
    const exports = getExports();
    const fn = exports.simlin_analyze_get_relative_loop_score;
    const loopIdPtr = stringToWasm(loopId);
    const resultsPtr = malloc(stepCount * 8);
    const outWrittenPtr = allocOutUsize();
    const outErrPtr = allocOutPtr();
    try {
        fn(sim, loopIdPtr, resultsPtr, stepCount, outWrittenPtr, outErrPtr);
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
        free(loopIdPtr);
        free(resultsPtr);
        free(outWrittenPtr);
        free(outErrPtr);
    }
}
const LOOP_SIZE = 16;
const LINK_SIZE = 20;
const PTR_SIZE = 4;
let structSizesValidated = false;
function ensureStructSizesValidated() {
    if (!structSizesValidated) {
        validateStructSizes();
        structSizesValidated = true;
    }
}
export function getRustStructSizes() {
    const exports = getExports();
    const sizeofLoop = exports.simlin_sizeof_loop;
    const sizeofLink = exports.simlin_sizeof_link;
    const sizeofErrorDetail = exports.simlin_sizeof_error_detail;
    const sizeofPtr = exports.simlin_sizeof_ptr;
    return {
        loopSize: sizeofLoop(),
        linkSize: sizeofLink(),
        errorDetailSize: sizeofErrorDetail(),
        ptrSize: sizeofPtr(),
    };
}
export function validateStructSizes() {
    const rustSizes = getRustStructSizes();
    if (rustSizes.ptrSize !== PTR_SIZE) {
        throw new Error(`Pointer size mismatch: Rust reports ${rustSizes.ptrSize}, TypeScript expects ${PTR_SIZE}`);
    }
    if (rustSizes.loopSize !== LOOP_SIZE) {
        throw new Error(`SimlinLoop size mismatch: Rust reports ${rustSizes.loopSize}, TypeScript expects ${LOOP_SIZE}`);
    }
    if (rustSizes.linkSize !== LINK_SIZE) {
        throw new Error(`SimlinLink size mismatch: Rust reports ${rustSizes.linkSize}, TypeScript expects ${LINK_SIZE}`);
    }
}
export function readLoops(loopsPtr) {
    if (loopsPtr === 0)
        return [];
    ensureStructSizesValidated();
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    const arrayPtr = view.getUint32(loopsPtr, true);
    const count = view.getUint32(loopsPtr + 4, true);
    const loops = [];
    for (let i = 0; i < count; i++) {
        const ptr = arrayPtr + i * LOOP_SIZE;
        const idPtr = view.getUint32(ptr, true);
        const varsPtr = view.getUint32(ptr + 4, true);
        const varCount = view.getUint32(ptr + 8, true);
        const polarity = view.getUint32(ptr + 12, true);
        const variables = [];
        for (let j = 0; j < varCount; j++) {
            const varNamePtr = view.getUint32(varsPtr + j * 4, true);
            const name = wasmToString(varNamePtr);
            if (name !== null)
                variables.push(name);
        }
        const id = wasmToString(idPtr) ?? '';
        loops.push({ id, variables, polarity });
    }
    return loops;
}
export function readLinks(linksPtr) {
    if (linksPtr === 0)
        return [];
    ensureStructSizesValidated();
    const memory = getMemory();
    const view = new DataView(memory.buffer);
    const arrayPtr = view.getUint32(linksPtr, true);
    const count = view.getUint32(linksPtr + 4, true);
    const links = [];
    for (let i = 0; i < count; i++) {
        const ptr = arrayPtr + i * LINK_SIZE;
        const fromPtr = view.getUint32(ptr, true);
        const toPtr = view.getUint32(ptr + 4, true);
        const polarity = view.getUint32(ptr + 8, true);
        const scorePtr = view.getUint32(ptr + 12, true);
        const scoreLen = view.getUint32(ptr + 16, true);
        const from = wasmToString(fromPtr) ?? '';
        const to = wasmToString(toPtr) ?? '';
        let score = null;
        if (scorePtr !== 0 && scoreLen > 0) {
            score = readFloat64Array(scorePtr, scoreLen);
        }
        links.push({ from, to, polarity, score });
    }
    return links;
}
//# sourceMappingURL=analysis.js.map