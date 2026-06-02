"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUrl = isUrl;
exports.isNode = isNode;
exports.loadFileNode = loadFileNode;
exports.init = init;
exports.getExports = getExports;
exports.getMemory = getMemory;
exports.isInitialized = isInitialized;
exports.ensureInitialized = ensureInitialized;
exports.configureWasm = configureWasm;
exports.getPanicMessage = getPanicMessage;
exports.clearPanicMessage = clearPanicMessage;
exports.reset = reset;
let wasmInstance = null;
let wasmMemory = null;
let initPromise = null;
let wasmSourceOverride = null;
function isUrl(path) {
    return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://');
}
function isFileUrl(path) {
    return path.startsWith('file://');
}
function isNode() {
    return typeof process !== 'undefined' && process.versions?.node !== undefined;
}
async function getDefaultNodeWasmPath() {
    const path = await Promise.resolve().then(() => __importStar(require('node:path')));
    return path.join(__dirname, '..', '..', 'core', 'libsimlin.wasm');
}
function getDefaultBrowserWasmUrl() {
    if (typeof document !== 'undefined') {
        const currentScript = document.currentScript;
        const scriptUrl = currentScript && 'src' in currentScript ? currentScript.src : undefined;
        const base = document.baseURI ?? scriptUrl ?? getLocationHref() ?? '';
        if (base) {
            return new URL('core/libsimlin.wasm', base).toString();
        }
    }
    const locationHref = getLocationHref();
    if (locationHref) {
        return new URL('core/libsimlin.wasm', locationHref).toString();
    }
    return './core/libsimlin.wasm';
}
function getLocationHref() {
    if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
        return undefined;
    }
    return globalThis.location?.href;
}
async function resolveWasmSource(source) {
    const provider = source ?? wasmSourceOverride;
    if (provider !== undefined && provider !== null) {
        return typeof provider === 'function' ? await provider() : provider;
    }
    return isNode() ? await getDefaultNodeWasmPath() : getDefaultBrowserWasmUrl();
}
async function loadFileNode(pathOrUrl) {
    const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
    const nodeBuffer = await fs.readFile(pathOrUrl);
    const buffer = nodeBuffer.buffer;
    return buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
}
async function init(wasmPathOrBuffer) {
    if (wasmInstance !== null) {
        return;
    }
    const resolvedSource = await resolveWasmSource(wasmPathOrBuffer);
    let buffer;
    if (resolvedSource instanceof ArrayBuffer) {
        buffer = resolvedSource;
    }
    else if (resolvedSource instanceof Uint8Array) {
        const copy = new Uint8Array(resolvedSource.length);
        copy.set(resolvedSource);
        buffer = copy.buffer;
    }
    else {
        const pathOrUrl = resolvedSource instanceof URL ? resolvedSource.toString() : resolvedSource;
        if (isNode() && (isFileUrl(pathOrUrl) || !isUrl(pathOrUrl))) {
            const fileTarget = isFileUrl(pathOrUrl) ? new URL(pathOrUrl) : pathOrUrl;
            buffer = await loadFileNode(fileTarget);
        }
        else {
            const response = await fetch(pathOrUrl);
            if (!response.ok) {
                throw new Error(`Failed to load WASM from ${pathOrUrl}: ${response.status} ${response.statusText}`);
            }
            buffer = await response.arrayBuffer();
        }
    }
    const module = await WebAssembly.compile(buffer);
    wasmMemory = new WebAssembly.Memory({ initial: 256, maximum: 16384 });
    wasmInstance = await WebAssembly.instantiate(module, {
        env: {
            memory: wasmMemory,
        },
    });
    const exports = wasmInstance.exports;
    if (exports.memory instanceof WebAssembly.Memory) {
        wasmMemory = exports.memory;
    }
    const initFn = exports.simlin_init;
    if (initFn) {
        initFn();
    }
}
function getExports() {
    if (wasmInstance === null) {
        throw new Error('WASM not initialized. Call Project.open() or ready() first.');
    }
    return wasmInstance.exports;
}
function getMemory() {
    if (wasmMemory === null) {
        throw new Error('WASM not initialized. Call Project.open() or ready() first.');
    }
    return wasmMemory;
}
function isInitialized() {
    return wasmInstance !== null;
}
async function ensureInitialized(wasmSource) {
    if (wasmInstance !== null) {
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
function configureWasm(config = {}) {
    if (wasmInstance !== null || initPromise !== null) {
        throw new Error('WASM already initialized');
    }
    wasmSourceOverride = config.source ?? null;
}
function getPanicMessage() {
    if (wasmInstance === null || wasmMemory === null) {
        return null;
    }
    const fn = wasmInstance.exports.simlin_get_panic_message;
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
function clearPanicMessage() {
    if (wasmInstance === null) {
        return;
    }
    const fn = wasmInstance.exports.simlin_clear_panic_message;
    if (fn) {
        fn();
    }
}
function reset() {
    wasmInstance = null;
    wasmMemory = null;
    initPromise = null;
    wasmSourceOverride = null;
}
//# sourceMappingURL=wasm.node.js.map