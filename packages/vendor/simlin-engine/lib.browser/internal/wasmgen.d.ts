import { SimlinModelPtr } from './types';
export interface WasmLayout {
    nSlots: number;
    nChunks: number;
    resultsOffset: number;
    varOffsets: Map<string, number>;
}
export interface WasmBlobExports {
    memory: WebAssembly.Memory;
    run(): void;
    run_to(time: number): void;
    run_initials(): void;
    reset(): void;
    set_value(offset: number, value: number): number;
    clear_values(): void;
    n_slots: WebAssembly.Global;
    n_chunks: WebAssembly.Global;
    results_offset: WebAssembly.Global;
    saved_steps: WebAssembly.Global;
}
export declare function simlin_model_compile_to_wasm(model: SimlinModelPtr, enableLtm: boolean): {
    wasm: Uint8Array;
    layout: Uint8Array;
};
export declare function parseWasmLayout(bytes: Uint8Array): WasmLayout;
export declare function readStridedSeries(memory: ArrayBufferLike, layout: WasmLayout, slot: number, count?: number): Float64Array;
//# sourceMappingURL=wasmgen.d.ts.map