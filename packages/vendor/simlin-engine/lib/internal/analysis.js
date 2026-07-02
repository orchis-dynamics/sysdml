"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simlin_analyze_get_loops = simlin_analyze_get_loops;
exports.simlin_free_loops = simlin_free_loops;
exports.simlin_analyze_get_links = simlin_analyze_get_links;
exports.simlin_analyze_links_from_wasm_results = simlin_analyze_links_from_wasm_results;
exports.simlin_free_links = simlin_free_links;
exports.simlin_analyze_get_relative_loop_score = simlin_analyze_get_relative_loop_score;
exports.getRustStructSizes = getRustStructSizes;
exports.validateStructSizes = validateStructSizes;
exports.readLoops = readLoops;
exports.readLinks = readLinks;
const wasm_1 = require("@simlin/engine/internal/wasm");
const memory_1 = require("./memory");
const error_1 = require("./error");
function simlin_analyze_get_loops(model) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_analyze_get_loops;
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
function simlin_free_loops(loops) {
    if (loops === 0)
        return;
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_free_loops;
    fn(loops);
}
function simlin_analyze_get_links(sim, includeInternal = true) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_analyze_get_links;
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(sim, includeInternal ? 1 : 0, outErrPtr);
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
function simlin_analyze_links_from_wasm_results(model, slab, layoutBytes, includeInternal = true) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_analyze_links_from_wasm_results;
    const slabPtr = (0, memory_1.copyToWasm)(slab);
    const layoutPtr = (0, memory_1.copyToWasm)(layoutBytes);
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        const result = fn(model, slabPtr, slab.length, layoutPtr, layoutBytes.length, includeInternal ? 1 : 0, outErrPtr);
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
        (0, memory_1.free)(slabPtr);
        (0, memory_1.free)(layoutPtr);
        (0, memory_1.free)(outErrPtr);
    }
}
function simlin_free_links(links) {
    if (links === 0)
        return;
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_free_links;
    fn(links);
}
function simlin_analyze_get_relative_loop_score(sim, loopId, stepCount) {
    const exports = (0, wasm_1.getExports)();
    const fn = exports.simlin_analyze_get_relative_loop_score;
    const loopIdPtr = (0, memory_1.stringToWasm)(loopId);
    const resultsPtr = (0, memory_1.malloc)(stepCount * 8);
    const outWrittenPtr = (0, memory_1.allocOutUsize)();
    const outErrPtr = (0, memory_1.allocOutPtr)();
    try {
        fn(sim, loopIdPtr, resultsPtr, stepCount, outWrittenPtr, outErrPtr);
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
        (0, memory_1.free)(loopIdPtr);
        (0, memory_1.free)(resultsPtr);
        (0, memory_1.free)(outWrittenPtr);
        (0, memory_1.free)(outErrPtr);
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
function getRustStructSizes() {
    const exports = (0, wasm_1.getExports)();
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
function validateStructSizes() {
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
function readLoops(loopsPtr) {
    if (loopsPtr === 0)
        return [];
    ensureStructSizesValidated();
    const memory = (0, wasm_1.getMemory)();
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
            const name = (0, memory_1.wasmToString)(varNamePtr);
            if (name !== null)
                variables.push(name);
        }
        const id = (0, memory_1.wasmToString)(idPtr) ?? '';
        loops.push({ id, variables, polarity });
    }
    return loops;
}
function readLinks(linksPtr) {
    if (linksPtr === 0)
        return [];
    ensureStructSizesValidated();
    const memory = (0, wasm_1.getMemory)();
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
        const from = (0, memory_1.wasmToString)(fromPtr) ?? '';
        const to = (0, memory_1.wasmToString)(toPtr) ?? '';
        let score = null;
        if (scorePtr !== 0 && scoreLen > 0) {
            score = (0, memory_1.readFloat64Array)(scorePtr, scoreLen);
        }
        links.push({ from, to, polarity, score });
    }
    return links;
}
//# sourceMappingURL=analysis.js.map