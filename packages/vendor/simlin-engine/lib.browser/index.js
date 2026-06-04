export { Project } from './project';
export { Model, SIMLIN_VARTYPE_STOCK, SIMLIN_VARTYPE_FLOW, SIMLIN_VARTYPE_AUX, SIMLIN_VARTYPE_MODULE } from './model';
export { Sim } from './sim';
export { Run } from './run';
export { ModelPatchBuilder } from './patch';
export { errorCodeDescription, ErrorCode } from './errors';
export * from './types';
export * from './json-types';
export { SimlinErrorKind, SimlinUnitErrorKind } from './internal/types';
import { getBackend } from '@simlin/engine/internal/backend-factory';
export function configureWasm(config) {
    getBackend().configureWasm(config);
}
export async function ready(wasmSource) {
    await getBackend().init(wasmSource);
}
export function isReady() {
    return getBackend().isInitialized();
}
export async function resetWasm() {
    await getBackend().reset();
}
//# sourceMappingURL=index.js.map