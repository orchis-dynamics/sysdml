import type { SimEngine } from './backend';
import type { ErrorDetail } from './internal/types';
export type WorkerProjectHandle = number;
export type WorkerModelHandle = number;
export type WorkerSimHandle = number;
export interface SerializedError {
    name: string;
    message: string;
    code?: number;
    details?: ErrorDetail[];
}
export type WorkerRequest = {
    type: 'init';
    requestId: number;
    wasmSource?: ArrayBuffer;
    wasmUrl?: string;
} | {
    type: 'isInitialized';
    requestId: number;
} | {
    type: 'reset';
    requestId: number;
} | {
    type: 'configureWasm';
    requestId: number;
    config: {
        source?: ArrayBuffer;
        url?: string;
    };
} | {
    type: 'projectOpenXmile';
    requestId: number;
    data: Uint8Array;
} | {
    type: 'projectOpenProtobuf';
    requestId: number;
    data: Uint8Array;
} | {
    type: 'projectOpenJson';
    requestId: number;
    data: Uint8Array;
    format: number;
} | {
    type: 'projectOpenVensim';
    requestId: number;
    data: Uint8Array;
} | {
    type: 'projectDispose';
    requestId: number;
    handle: WorkerProjectHandle;
} | {
    type: 'projectGetModelCount';
    requestId: number;
    handle: WorkerProjectHandle;
} | {
    type: 'projectGetModelNames';
    requestId: number;
    handle: WorkerProjectHandle;
} | {
    type: 'projectGetModel';
    requestId: number;
    handle: WorkerProjectHandle;
    name: string | null;
} | {
    type: 'projectIsSimulatable';
    requestId: number;
    handle: WorkerProjectHandle;
    modelName: string | null;
} | {
    type: 'projectSerializeProtobuf';
    requestId: number;
    handle: WorkerProjectHandle;
} | {
    type: 'projectSerializeJson';
    requestId: number;
    handle: WorkerProjectHandle;
    format: number;
    includeStdlib?: boolean;
} | {
    type: 'projectSerializeXmile';
    requestId: number;
    handle: WorkerProjectHandle;
} | {
    type: 'projectRenderSvg';
    requestId: number;
    handle: WorkerProjectHandle;
    modelName: string;
} | {
    type: 'projectRenderPng';
    requestId: number;
    handle: WorkerProjectHandle;
    modelName: string;
    width: number;
    height: number;
} | {
    type: 'projectGetErrors';
    requestId: number;
    handle: WorkerProjectHandle;
} | {
    type: 'projectApplyPatch';
    requestId: number;
    handle: WorkerProjectHandle;
    patchJson: string;
    dryRun: boolean;
    allowErrors: boolean;
} | {
    type: 'modelGetName';
    requestId: number;
    handle: WorkerModelHandle;
} | {
    type: 'modelDispose';
    requestId: number;
    handle: WorkerModelHandle;
} | {
    type: 'modelGetIncomingLinks';
    requestId: number;
    handle: WorkerModelHandle;
    varName: string;
} | {
    type: 'modelGetLinks';
    requestId: number;
    handle: WorkerModelHandle;
} | {
    type: 'modelGetLoops';
    requestId: number;
    handle: WorkerModelHandle;
} | {
    type: 'modelGetLatexEquation';
    requestId: number;
    handle: WorkerModelHandle;
    ident: string;
} | {
    type: 'modelGetVarJson';
    requestId: number;
    handle: WorkerModelHandle;
    varName: string;
} | {
    type: 'modelGetVarNames';
    requestId: number;
    handle: WorkerModelHandle;
    typeMask: number;
    filter: string | null;
} | {
    type: 'modelGetSimSpecsJson';
    requestId: number;
    handle: WorkerModelHandle;
} | {
    type: 'simNew';
    requestId: number;
    modelHandle: WorkerModelHandle;
    enableLtm: boolean;
    engine?: SimEngine;
} | {
    type: 'simDispose';
    requestId: number;
    handle: WorkerSimHandle;
} | {
    type: 'simRunTo';
    requestId: number;
    handle: WorkerSimHandle;
    time: number;
} | {
    type: 'simRunToEnd';
    requestId: number;
    handle: WorkerSimHandle;
} | {
    type: 'simReset';
    requestId: number;
    handle: WorkerSimHandle;
} | {
    type: 'simGetTime';
    requestId: number;
    handle: WorkerSimHandle;
} | {
    type: 'simGetStepCount';
    requestId: number;
    handle: WorkerSimHandle;
} | {
    type: 'simGetValue';
    requestId: number;
    handle: WorkerSimHandle;
    name: string;
} | {
    type: 'simSetValue';
    requestId: number;
    handle: WorkerSimHandle;
    name: string;
    value: number;
} | {
    type: 'simGetSeries';
    requestId: number;
    handle: WorkerSimHandle;
    name: string;
} | {
    type: 'simGetVarNames';
    requestId: number;
    handle: WorkerSimHandle;
} | {
    type: 'simGetLinks';
    requestId: number;
    handle: WorkerSimHandle;
};
export type WorkerResponse = {
    type: 'success';
    requestId: number;
    result: unknown;
    transfer?: ArrayBuffer[];
} | {
    type: 'error';
    requestId: number;
    error: SerializedError;
};
export declare enum WorkerState {
    UNINITIALIZED = "UNINITIALIZED",
    INITIALIZING = "INITIALIZING",
    READY = "READY",
    FAILED = "FAILED"
}
export declare function serializeError(err: unknown): SerializedError;
export declare function deserializeError(serialized: SerializedError): Error;
export declare const VALID_REQUEST_TYPES: ReadonlySet<string>;
export declare function isValidRequest(msg: unknown): msg is WorkerRequest;
//# sourceMappingURL=worker-protocol.d.ts.map