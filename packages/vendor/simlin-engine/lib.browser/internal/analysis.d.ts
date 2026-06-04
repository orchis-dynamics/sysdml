import { SimlinModelPtr, SimlinSimPtr, SimlinLoopsPtr, SimlinLinksPtr, Link, Loop } from './types';
export declare function simlin_analyze_get_loops(model: SimlinModelPtr): SimlinLoopsPtr;
export declare function simlin_free_loops(loops: SimlinLoopsPtr): void;
export declare function simlin_analyze_get_links(sim: SimlinSimPtr, includeInternal?: boolean): SimlinLinksPtr;
export declare function simlin_analyze_links_from_wasm_results(model: SimlinModelPtr, slab: Uint8Array, layoutBytes: Uint8Array, includeInternal?: boolean): SimlinLinksPtr;
export declare function simlin_free_links(links: SimlinLinksPtr): void;
export declare function simlin_analyze_get_relative_loop_score(sim: SimlinSimPtr, loopId: string, stepCount: number): Float64Array;
export declare function getRustStructSizes(): {
    loopSize: number;
    linkSize: number;
    errorDetailSize: number;
    ptrSize: number;
};
export declare function validateStructSizes(): void;
export declare function readLoops(loopsPtr: SimlinLoopsPtr): Loop[];
export declare function readLinks(linksPtr: SimlinLinksPtr): Link[];
//# sourceMappingURL=analysis.d.ts.map