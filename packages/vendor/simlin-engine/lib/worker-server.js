"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerServer = void 0;
const direct_backend_1 = require("./direct-backend");
const wasm_1 = require("@simlin/engine/internal/wasm");
const worker_protocol_1 = require("./worker-protocol");
class WorkerServer {
    constructor(postMessage) {
        this.state = worker_protocol_1.WorkerState.UNINITIALIZED;
        this.nextHandle = 1;
        this.projectHandles = new Map();
        this.modelHandles = new Map();
        this.simHandles = new Map();
        this.projectChildren = new Map();
        this.modelToProject = new Map();
        this.simToProject = new Map();
        this.backend = new direct_backend_1.DirectBackend();
        this.postMessage = postMessage;
    }
    get currentState() {
        return this.state;
    }
    getProjectChildCount(projectHandle) {
        return this.projectChildren.get(projectHandle)?.size;
    }
    handleMessage(msg) {
        if (!(0, worker_protocol_1.isValidRequest)(msg)) {
            return;
        }
        const request = msg;
        const { requestId } = request;
        try {
            if (request.type === 'init' || request.type === 'isInitialized' || request.type === 'reset') {
                this.handleLifecycle(request);
                return;
            }
            if (request.type === 'configureWasm') {
                this.handleConfigureWasm(request);
                return;
            }
            if (this.state !== worker_protocol_1.WorkerState.READY) {
                this.sendError(requestId, new Error(`Worker not ready (state: ${this.state}). Call init first.`));
                return;
            }
            this.handleOperation(request);
        }
        catch (err) {
            this.sendError(requestId, err);
        }
    }
    allocHandle() {
        return this.nextHandle++;
    }
    getProjectHandle(workerHandle) {
        const handle = this.projectHandles.get(workerHandle);
        if (handle === undefined) {
            throw new Error(`Invalid or disposed project handle: ${workerHandle}`);
        }
        return handle;
    }
    getModelHandle(workerHandle) {
        const handle = this.modelHandles.get(workerHandle);
        if (handle === undefined) {
            throw new Error(`Invalid or disposed model handle: ${workerHandle}`);
        }
        return handle;
    }
    getSimHandle(workerHandle) {
        const handle = this.simHandles.get(workerHandle);
        if (handle === undefined) {
            throw new Error(`Invalid or disposed sim handle: ${workerHandle}`);
        }
        return handle;
    }
    registerProjectHandle(backendHandle) {
        const workerHandle = this.allocHandle();
        this.projectHandles.set(workerHandle, backendHandle);
        this.projectChildren.set(workerHandle, new Set());
        return workerHandle;
    }
    registerModelHandle(backendHandle, parentProject) {
        const workerHandle = this.allocHandle();
        this.modelHandles.set(workerHandle, backendHandle);
        this.projectChildren.get(parentProject)?.add(workerHandle);
        this.modelToProject.set(workerHandle, parentProject);
        return workerHandle;
    }
    registerSimHandle(backendHandle, parentProject) {
        const workerHandle = this.allocHandle();
        this.simHandles.set(workerHandle, backendHandle);
        this.projectChildren.get(parentProject)?.add(workerHandle);
        this.simToProject.set(workerHandle, parentProject);
        return workerHandle;
    }
    handleLifecycle(request) {
        const { requestId } = request;
        switch (request.type) {
            case 'init': {
                if (this.state === worker_protocol_1.WorkerState.READY) {
                    this.sendSuccess(requestId, undefined);
                    return;
                }
                this.state = worker_protocol_1.WorkerState.INITIALIZING;
                const wasmSource = request.wasmSource
                    ? new Uint8Array(request.wasmSource)
                    : request.wasmUrl
                        ? request.wasmUrl
                        : undefined;
                this.backend
                    .init(wasmSource)
                    .then(() => {
                    this.state = worker_protocol_1.WorkerState.READY;
                    this.sendSuccess(requestId, undefined);
                })
                    .catch((err) => {
                    this.state = worker_protocol_1.WorkerState.FAILED;
                    this.sendError(requestId, err);
                });
                return;
            }
            case 'isInitialized': {
                this.sendSuccess(requestId, this.state === worker_protocol_1.WorkerState.READY);
                return;
            }
            case 'reset': {
                this.simHandles.clear();
                this.modelHandles.clear();
                this.projectHandles.clear();
                this.projectChildren.clear();
                this.modelToProject.clear();
                this.simToProject.clear();
                this.nextHandle = 1;
                this.backend.reset();
                this.state = worker_protocol_1.WorkerState.UNINITIALIZED;
                this.sendSuccess(requestId, undefined);
                return;
            }
        }
    }
    handleConfigureWasm(request) {
        const { requestId, config } = request;
        const source = config.source ? new Uint8Array(config.source) : config.url;
        this.backend.configureWasm(source !== undefined ? { source } : {});
        this.sendSuccess(requestId, undefined);
    }
    handleOperation(request) {
        const { requestId } = request;
        switch (request.type) {
            case 'projectOpenXmile': {
                const backendHandle = this.backend.projectOpenXmile(request.data);
                const workerHandle = this.registerProjectHandle(backendHandle);
                this.sendSuccess(requestId, workerHandle);
                return;
            }
            case 'projectOpenProtobuf': {
                const backendHandle = this.backend.projectOpenProtobuf(request.data);
                const workerHandle = this.registerProjectHandle(backendHandle);
                this.sendSuccess(requestId, workerHandle);
                return;
            }
            case 'projectOpenJson': {
                const backendHandle = this.backend.projectOpenJson(request.data, request.format);
                const workerHandle = this.registerProjectHandle(backendHandle);
                this.sendSuccess(requestId, workerHandle);
                return;
            }
            case 'projectOpenVensim': {
                const backendHandle = this.backend.projectOpenVensim(request.data);
                const workerHandle = this.registerProjectHandle(backendHandle);
                this.sendSuccess(requestId, workerHandle);
                return;
            }
            case 'projectDispose': {
                this.disposeProject(request.handle);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'projectGetModelCount': {
                const handle = this.getProjectHandle(request.handle);
                this.sendSuccess(requestId, this.backend.projectGetModelCount(handle));
                return;
            }
            case 'projectGetModelNames': {
                const handle = this.getProjectHandle(request.handle);
                this.sendSuccess(requestId, this.backend.projectGetModelNames(handle));
                return;
            }
            case 'projectGetModel': {
                const handle = this.getProjectHandle(request.handle);
                const backendModelHandle = this.backend.projectGetModel(handle, request.name);
                const workerModelHandle = this.registerModelHandle(backendModelHandle, request.handle);
                this.sendSuccess(requestId, workerModelHandle);
                return;
            }
            case 'projectIsSimulatable': {
                const handle = this.getProjectHandle(request.handle);
                this.sendSuccess(requestId, this.backend.projectIsSimulatable(handle, request.modelName));
                return;
            }
            case 'projectSerializeProtobuf': {
                const handle = this.getProjectHandle(request.handle);
                const result = this.backend.projectSerializeProtobuf(handle);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'projectSerializeJson': {
                const handle = this.getProjectHandle(request.handle);
                const result = this.backend.projectSerializeJson(handle, request.format, request.includeStdlib ?? false);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'projectSerializeXmile': {
                const handle = this.getProjectHandle(request.handle);
                const result = this.backend.projectSerializeXmile(handle);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'projectRenderSvg': {
                const handle = this.getProjectHandle(request.handle);
                const result = this.backend.projectRenderSvg(handle, request.modelName);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'projectRenderPng': {
                const handle = this.getProjectHandle(request.handle);
                const result = this.backend.projectRenderPng(handle, request.modelName, request.width, request.height);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'projectGetErrors': {
                const handle = this.getProjectHandle(request.handle);
                this.sendSuccess(requestId, this.backend.projectGetErrors(handle));
                return;
            }
            case 'projectApplyPatch': {
                const handle = this.getProjectHandle(request.handle);
                const patch = JSON.parse(request.patchJson);
                const result = this.backend.projectApplyPatch(handle, patch, request.dryRun, request.allowErrors);
                this.sendSuccess(requestId, result);
                return;
            }
            case 'modelGetName': {
                const handle = this.getModelHandle(request.handle);
                this.sendSuccess(requestId, this.backend.modelGetName(handle));
                return;
            }
            case 'modelDispose': {
                this.disposeModel(request.handle);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'modelGetIncomingLinks': {
                const handle = this.getModelHandle(request.handle);
                this.sendSuccess(requestId, this.backend.modelGetIncomingLinks(handle, request.varName));
                return;
            }
            case 'modelGetLinks': {
                const handle = this.getModelHandle(request.handle);
                this.sendSuccess(requestId, this.backend.modelGetLinks(handle));
                return;
            }
            case 'modelGetLoops': {
                const handle = this.getModelHandle(request.handle);
                this.sendSuccess(requestId, this.backend.modelGetLoops(handle));
                return;
            }
            case 'modelGetLatexEquation': {
                const handle = this.getModelHandle(request.handle);
                this.sendSuccess(requestId, this.backend.modelGetLatexEquation(handle, request.ident));
                return;
            }
            case 'modelGetVarJson': {
                const handle = this.getModelHandle(request.handle);
                const result = this.backend.modelGetVarJson(handle, request.varName);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'modelGetVarNames': {
                const handle = this.getModelHandle(request.handle);
                this.sendSuccess(requestId, this.backend.modelGetVarNames(handle, request.typeMask, request.filter));
                return;
            }
            case 'modelGetSimSpecsJson': {
                const handle = this.getModelHandle(request.handle);
                const result = this.backend.modelGetSimSpecsJson(handle);
                this.sendBytesWithTransfer(requestId, result);
                return;
            }
            case 'simNew': {
                const modelHandle = this.getModelHandle(request.modelHandle);
                const backendSimHandle = this.backend.simNew(modelHandle, request.enableLtm, request.engine);
                const parentProject = this.modelToProject.get(request.modelHandle);
                if (parentProject === undefined) {
                    throw new Error(`Model handle ${request.modelHandle} not associated with a project`);
                }
                const workerSimHandle = this.registerSimHandle(backendSimHandle, parentProject);
                this.sendSuccess(requestId, workerSimHandle);
                return;
            }
            case 'simDispose': {
                this.disposeSim(request.handle);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'simRunTo': {
                const handle = this.getSimHandle(request.handle);
                this.backend.simRunTo(handle, request.time);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'simRunToEnd': {
                const handle = this.getSimHandle(request.handle);
                this.backend.simRunToEnd(handle);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'simReset': {
                const handle = this.getSimHandle(request.handle);
                this.backend.simReset(handle);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'simGetTime': {
                const handle = this.getSimHandle(request.handle);
                this.sendSuccess(requestId, this.backend.simGetTime(handle));
                return;
            }
            case 'simGetStepCount': {
                const handle = this.getSimHandle(request.handle);
                this.sendSuccess(requestId, this.backend.simGetStepCount(handle));
                return;
            }
            case 'simGetValue': {
                const handle = this.getSimHandle(request.handle);
                this.sendSuccess(requestId, this.backend.simGetValue(handle, request.name));
                return;
            }
            case 'simSetValue': {
                const handle = this.getSimHandle(request.handle);
                this.backend.simSetValue(handle, request.name, request.value);
                this.sendSuccess(requestId, undefined);
                return;
            }
            case 'simGetSeries': {
                const handle = this.getSimHandle(request.handle);
                const result = this.backend.simGetSeries(handle, request.name);
                this.sendFloat64WithTransfer(requestId, result);
                return;
            }
            case 'simGetVarNames': {
                const handle = this.getSimHandle(request.handle);
                this.sendSuccess(requestId, this.backend.simGetVarNames(handle));
                return;
            }
            case 'simGetLinks': {
                const handle = this.getSimHandle(request.handle);
                this.sendSuccess(requestId, this.backend.simGetLinks(handle));
                return;
            }
            case 'init':
            case 'isInitialized':
            case 'reset':
            case 'configureWasm':
                throw new Error(`Lifecycle request '${request.type}' should not reach handleOperation`);
            default: {
                const _exhaustive = request;
                throw new Error(`Unknown request type: ${_exhaustive.type}`);
            }
        }
    }
    disposeProject(workerHandle) {
        const children = this.projectChildren.get(workerHandle);
        if (children) {
            for (const childHandle of children) {
                if (this.modelHandles.has(childHandle)) {
                    this.disposeModel(childHandle);
                }
                else if (this.simHandles.has(childHandle)) {
                    this.disposeSim(childHandle);
                }
            }
        }
        this.projectChildren.delete(workerHandle);
        const backendHandle = this.projectHandles.get(workerHandle);
        if (backendHandle !== undefined) {
            this.backend.projectDispose(backendHandle);
            this.projectHandles.delete(workerHandle);
        }
    }
    disposeModel(workerHandle) {
        const backendHandle = this.modelHandles.get(workerHandle);
        if (backendHandle !== undefined) {
            this.backend.modelDispose(backendHandle);
            this.modelHandles.delete(workerHandle);
        }
        const parentProject = this.modelToProject.get(workerHandle);
        if (parentProject !== undefined) {
            this.projectChildren.get(parentProject)?.delete(workerHandle);
        }
        this.modelToProject.delete(workerHandle);
    }
    disposeSim(workerHandle) {
        const backendHandle = this.simHandles.get(workerHandle);
        if (backendHandle !== undefined) {
            this.backend.simDispose(backendHandle);
            this.simHandles.delete(workerHandle);
        }
        const parentProject = this.simToProject.get(workerHandle);
        if (parentProject !== undefined) {
            this.projectChildren.get(parentProject)?.delete(workerHandle);
        }
        this.simToProject.delete(workerHandle);
    }
    sendSuccess(requestId, result) {
        this.postMessage({ type: 'success', requestId, result });
    }
    sendBytesWithTransfer(requestId, result) {
        const safe = this.detachable(result);
        this.postMessage({ type: 'success', requestId, result: safe }, [safe.buffer]);
    }
    sendFloat64WithTransfer(requestId, result) {
        const safe = this.detachable(result);
        this.postMessage({ type: 'success', requestId, result: safe }, [safe.buffer]);
    }
    detachable(view) {
        if (view.buffer.byteLength !== view.byteLength || view.byteOffset !== 0) {
            return view.slice();
        }
        return view;
    }
    sendError(requestId, err) {
        if (err instanceof WebAssembly.RuntimeError) {
            const panicMsg = (0, wasm_1.getPanicMessage)();
            if (panicMsg) {
                (0, wasm_1.clearPanicMessage)();
                const enriched = new Error(`WASM panic: ${panicMsg}`);
                this.postMessage({ type: 'error', requestId, error: (0, worker_protocol_1.serializeError)(enriched) });
                return;
            }
        }
        this.postMessage({ type: 'error', requestId, error: (0, worker_protocol_1.serializeError)(err) });
    }
}
exports.WorkerServer = WorkerServer;
//# sourceMappingURL=worker-server.js.map