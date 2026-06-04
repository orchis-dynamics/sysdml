import { Ptr } from './types';
export declare function malloc(size: number): Ptr;
export declare function free(ptr: Ptr): void;
export declare function freeString(ptr: Ptr): void;
export declare function stringToWasm(str: string): Ptr;
export declare function wasmToString(ptr: Ptr, maxLength?: number): string | null;
export declare function wasmToStringAndFree(ptr: Ptr): string | null;
export declare function copyToWasm(data: Uint8Array): Ptr;
export declare function copyFromWasm(ptr: Ptr, length: number): Uint8Array;
export declare function allocOutPtr(): Ptr;
export declare function readOutPtr(outPtr: Ptr): Ptr;
export declare function allocOutUsize(): Ptr;
export declare function readOutUsize(outPtr: Ptr): number;
export declare function readDouble(ptr: Ptr): number;
export declare function readFloat64Array(ptr: Ptr, count: number): Float64Array;
export declare function readU16(ptr: Ptr): number;
export declare function readU32(ptr: Ptr): number;
//# sourceMappingURL=memory.d.ts.map