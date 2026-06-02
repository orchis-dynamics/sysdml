export type WasmSource = string | URL | ArrayBuffer | Uint8Array;
export type WasmSourceProvider = WasmSource | (() => WasmSource | Promise<WasmSource>);
export interface WasmConfig {
    source?: WasmSourceProvider;
}
export declare function isUrl(path: string): boolean;
export declare function isNode(): boolean;
export declare function loadFileNode(pathOrUrl: string | URL): Promise<ArrayBuffer>;
export declare function init(wasmPathOrBuffer?: WasmSourceProvider): Promise<void>;
export declare function getExports(): WebAssembly.Exports;
export declare function getMemory(): WebAssembly.Memory;
export declare function isInitialized(): boolean;
export declare function ensureInitialized(wasmSource?: WasmSourceProvider): Promise<void>;
export declare function configureWasm(config?: WasmConfig): void;
export declare function getPanicMessage(): string | null;
export declare function clearPanicMessage(): void;
export declare function reset(): void;
//# sourceMappingURL=wasm.node.d.ts.map