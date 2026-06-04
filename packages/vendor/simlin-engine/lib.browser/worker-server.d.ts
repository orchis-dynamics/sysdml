import { WorkerResponse, WorkerState, WorkerProjectHandle } from './worker-protocol';
type PostMessageFn = (msg: WorkerResponse, transfer?: Transferable[]) => void;
export declare class WorkerServer {
    private backend;
    private state;
    private postMessage;
    private nextHandle;
    private projectHandles;
    private modelHandles;
    private simHandles;
    private projectChildren;
    constructor(postMessage: PostMessageFn);
    get currentState(): WorkerState;
    getProjectChildCount(projectHandle: WorkerProjectHandle): number | undefined;
    handleMessage(msg: unknown): void;
    private allocHandle;
    private getProjectHandle;
    private getModelHandle;
    private getSimHandle;
    private registerProjectHandle;
    private registerModelHandle;
    private registerSimHandle;
    private modelToProject;
    private simToProject;
    private handleLifecycle;
    private handleConfigureWasm;
    private handleOperation;
    private disposeProject;
    private disposeModel;
    private disposeSim;
    private sendSuccess;
    private sendBytesWithTransfer;
    private sendFloat64WithTransfer;
    private detachable;
    private sendError;
}
export {};
//# sourceMappingURL=worker-server.d.ts.map