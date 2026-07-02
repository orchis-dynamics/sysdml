export var WorkerState;
(function (WorkerState) {
    WorkerState["UNINITIALIZED"] = "UNINITIALIZED";
    WorkerState["INITIALIZING"] = "INITIALIZING";
    WorkerState["READY"] = "READY";
    WorkerState["FAILED"] = "FAILED";
})(WorkerState || (WorkerState = {}));
export function serializeError(err) {
    if (err instanceof Error) {
        const serialized = {
            name: err.name,
            message: err.message,
        };
        const errAny = err;
        if (typeof errAny['code'] === 'number') {
            serialized.code = errAny['code'];
        }
        if (Array.isArray(errAny['details'])) {
            serialized.details = errAny['details'];
        }
        return serialized;
    }
    return {
        name: 'Error',
        message: String(err),
    };
}
export function deserializeError(serialized) {
    const err = new Error(serialized.message);
    err.name = serialized.name;
    if (serialized.code !== undefined) {
        err.code = serialized.code;
    }
    if (serialized.details !== undefined) {
        err.details = serialized.details;
    }
    return err;
}
export const VALID_REQUEST_TYPES = new Set([
    'init',
    'isInitialized',
    'reset',
    'configureWasm',
    'projectOpenXmile',
    'projectOpenProtobuf',
    'projectOpenJson',
    'projectOpenVensim',
    'projectDispose',
    'projectGetModelCount',
    'projectGetModelNames',
    'projectGetModel',
    'projectIsSimulatable',
    'projectSerializeProtobuf',
    'projectSerializeJson',
    'projectSerializeXmile',
    'projectRenderSvg',
    'projectRenderPng',
    'projectGetErrors',
    'projectApplyPatch',
    'modelGetName',
    'modelDispose',
    'modelGetIncomingLinks',
    'modelGetLinks',
    'modelGetLoops',
    'modelGetLatexEquation',
    'modelGetVarJson',
    'modelGetVarNames',
    'modelGetSimSpecsJson',
    'simNew',
    'simDispose',
    'simRunTo',
    'simRunToEnd',
    'simReset',
    'simGetTime',
    'simGetStepCount',
    'simGetValue',
    'simSetValue',
    'simGetSeries',
    'simGetVarNames',
    'simGetLinks',
]);
export function isValidRequest(msg) {
    if (typeof msg !== 'object' || msg === null)
        return false;
    const obj = msg;
    return (typeof obj['type'] === 'string' && VALID_REQUEST_TYPES.has(obj['type']) && typeof obj['requestId'] === 'number');
}
//# sourceMappingURL=worker-protocol.js.map