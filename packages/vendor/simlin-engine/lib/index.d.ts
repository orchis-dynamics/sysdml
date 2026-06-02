export { Project } from './project';
export { Model, SIMLIN_VARTYPE_STOCK, SIMLIN_VARTYPE_FLOW, SIMLIN_VARTYPE_AUX, SIMLIN_VARTYPE_MODULE } from './model';
export { Sim } from './sim';
export { Run } from './run';
export type { RunData } from './run';
export { ModelPatchBuilder } from './patch';
export { errorCodeDescription, ErrorCode } from './errors';
export * from './types';
export * from './json-types';
export type { ErrorDetail } from './internal/types';
export { SimlinErrorKind, SimlinUnitErrorKind } from './internal/types';
export type { EngineBackend, ProjectHandle, ModelHandle, SimHandle } from './backend';
export type { WasmConfig, WasmSource, WasmSourceProvider } from '@simlin/engine/internal/wasm';
export declare function configureWasm(config: import('@simlin/engine/internal/wasm').WasmConfig): void;
export declare function ready(wasmSource?: import('@simlin/engine/internal/wasm').WasmSourceProvider): Promise<void>;
export declare function isReady(): boolean;
export declare function resetWasm(): Promise<void>;
//# sourceMappingURL=index.d.ts.map