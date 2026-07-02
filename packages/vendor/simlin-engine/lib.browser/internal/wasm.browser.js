import * as wasmModule from '../../core/libsimlin.wasm';
let wasmExports = null;
let wasmMemory = null;
let initPromise = null;
export function isUrl(path) {
    return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://');
}
export function isNode() {
    return typeof process !== 'undefined' && process.versions?.node !== undefined;
}
export async function loadFileNode(_pathOrUrl) {
    throw new Error('loadFileNode is not available in the browser build');
}
export async function init(_wasmPathOrBuffer) {
    if (wasmExports !== null) {
        return;
    }
    wasmExports = wasmModule;
    if (wasmExports.memory instanceof WebAssembly.Memory) {
        wasmMemory = wasmExports.memory;
    }
    const initFn = wasmExports.simlin_init;
    if (initFn) {
        initFn();
    }
}
export function getExports() {
    if (wasmExports === null) {
        throw new Error('WASM not initialized. Call Project.open() or ready() first.');
    }
    return wasmExports;
}
export function getMemory() {
    if (wasmMemory === null) {
        throw new Error('WASM not initialized. Call Project.open() or ready() first.');
    }
    return wasmMemory;
}
export function isInitialized() {
    return wasmExports !== null;
}
export async function ensureInitialized(wasmSource) {
    if (wasmExports !== null) {
        return;
    }
    if (initPromise !== null) {
        await initPromise;
        return;
    }
    initPromise = init(wasmSource);
    try {
        await initPromise;
    }
    finally {
        initPromise = null;
    }
}
export function configureWasm(_config = {}) {
}
export function getPanicMessage() {
    if (wasmExports === null || wasmMemory === null) {
        return null;
    }
    const fn = wasmExports.simlin_get_panic_message;
    if (!fn) {
        return null;
    }
    const ptr = fn();
    if (ptr === 0) {
        return null;
    }
    const view = new Uint8Array(wasmMemory.buffer);
    let end = ptr;
    const limit = Math.min(ptr + 8192, view.length);
    while (end < limit && view[end] !== 0) {
        end++;
    }
    return new TextDecoder().decode(view.slice(ptr, end));
}
export function clearPanicMessage() {
    if (wasmExports === null) {
        return;
    }
    const fn = wasmExports.simlin_clear_panic_message;
    if (fn) {
        fn();
    }
}
export function reset() {
    wasmExports = null;
    wasmMemory = null;
    initPromise = null;
}
//# sourceMappingURL=wasm.browser.js.map