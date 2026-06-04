import { deserializeError } from './worker-protocol';
export class WorkerBackend {
    constructor(post, onMessage) {
        this._nextRequestId = 1;
        this._pending = new Map();
        this._initialized = false;
        this._initializing = false;
        this._terminated = false;
        this._storedWasmConfig = null;
        this._queue = [];
        this._processing = false;
        this._post = post;
        onMessage((msg) => this.handleResponse(msg));
    }
    handleResponse(msg) {
        const pending = this._pending.get(msg.requestId);
        if (!pending) {
            return;
        }
        this._pending.delete(msg.requestId);
        if (msg.type === 'success') {
            pending.resolve(msg.result);
        }
        else {
            pending.reject(deserializeError(msg.error));
        }
    }
    sendRequest(buildMessage, transfer) {
        if (this._terminated) {
            return Promise.reject(new Error('WorkerBackend terminated'));
        }
        return new Promise((resolve, reject) => {
            this._queue.push({
                execute: () => {
                    const requestId = this._nextRequestId++;
                    this._pending.set(requestId, {
                        resolve: (value) => {
                            resolve(value);
                            this.processNext();
                        },
                        reject: (error) => {
                            reject(error);
                            this.processNext();
                        },
                    });
                    try {
                        const msg = buildMessage(requestId);
                        this._post(msg, transfer);
                    }
                    catch (err) {
                        this._pending.delete(requestId);
                        reject(err instanceof Error ? err : new Error(String(err)));
                        this.processNext();
                    }
                },
                reject,
            });
            if (!this._processing) {
                this.processNext();
            }
        });
    }
    processNext() {
        const entry = this._queue.shift();
        if (!entry) {
            this._processing = false;
            return;
        }
        this._processing = true;
        entry.execute();
    }
    async resolveWasmSource(source) {
        if (source === undefined) {
            return undefined;
        }
        if (typeof source === 'function') {
            const resolved = await source();
            return this.resolveWasmSource(resolved);
        }
        if (source instanceof Uint8Array) {
            if (source.buffer instanceof ArrayBuffer &&
                source.byteOffset === 0 &&
                source.byteLength === source.buffer.byteLength) {
                return { buffer: source.buffer };
            }
            return { buffer: source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) };
        }
        if (source instanceof ArrayBuffer) {
            return { buffer: source };
        }
        if (source instanceof URL) {
            return { url: source.toString() };
        }
        return { url: source };
    }
    async init(wasmSource) {
        if (this._initialized || this._initializing) {
            return;
        }
        this._initializing = true;
        try {
            if (this._storedWasmConfig) {
                const resolved = await this.resolveWasmSource(this._storedWasmConfig.source);
                if (resolved) {
                    const transfer = resolved.buffer ? [resolved.buffer] : undefined;
                    await this.sendRequest((requestId) => ({
                        type: 'configureWasm',
                        requestId,
                        config: { source: resolved.buffer, url: resolved.url },
                    }), transfer);
                }
                this._storedWasmConfig = null;
            }
            const resolved = await this.resolveWasmSource(wasmSource);
            const transfer = resolved?.buffer ? [resolved.buffer] : undefined;
            await this.sendRequest((requestId) => ({
                type: 'init',
                requestId,
                wasmSource: resolved?.buffer,
                wasmUrl: resolved?.url,
            }), transfer);
            this._initialized = true;
        }
        finally {
            this._initializing = false;
        }
    }
    isInitialized() {
        return this._initialized;
    }
    async reset() {
        await this.sendRequest((requestId) => ({
            type: 'reset',
            requestId,
        }));
        this._initialized = false;
    }
    handleWorkerError(error) {
        this._terminated = true;
        this._initialized = false;
        this._initializing = false;
        this._processing = false;
        const queuedEntries = this._queue;
        this._queue = [];
        for (const [, pending] of this._pending) {
            pending.reject(error);
        }
        this._pending.clear();
        for (const entry of queuedEntries) {
            entry.reject(error);
        }
    }
    terminate() {
        this._terminated = true;
        this._initialized = false;
        this._initializing = false;
        this._processing = false;
        const error = new Error('WorkerBackend terminated');
        const queuedEntries = this._queue;
        this._queue = [];
        for (const [, pending] of this._pending) {
            pending.reject(error);
        }
        this._pending.clear();
        for (const entry of queuedEntries) {
            entry.reject(error);
        }
    }
    configureWasm(config) {
        if (this._initialized || this._initializing) {
            throw new Error('WASM already initialized');
        }
        this._storedWasmConfig = config;
    }
    projectOpenXmile(data) {
        return this.sendRequest((requestId) => ({
            type: 'projectOpenXmile',
            requestId,
            data,
        }));
    }
    projectOpenProtobuf(data) {
        return this.sendRequest((requestId) => ({
            type: 'projectOpenProtobuf',
            requestId,
            data,
        }));
    }
    projectOpenJson(data, format) {
        return this.sendRequest((requestId) => ({
            type: 'projectOpenJson',
            requestId,
            data,
            format,
        }));
    }
    projectOpenVensim(data) {
        return this.sendRequest((requestId) => ({
            type: 'projectOpenVensim',
            requestId,
            data,
        }));
    }
    projectDispose(handle) {
        return this.sendRequest((requestId) => ({
            type: 'projectDispose',
            requestId,
            handle,
        }));
    }
    projectGetModelCount(handle) {
        return this.sendRequest((requestId) => ({
            type: 'projectGetModelCount',
            requestId,
            handle,
        }));
    }
    projectGetModelNames(handle) {
        return this.sendRequest((requestId) => ({
            type: 'projectGetModelNames',
            requestId,
            handle,
        }));
    }
    projectGetModel(handle, name) {
        return this.sendRequest((requestId) => ({
            type: 'projectGetModel',
            requestId,
            handle,
            name,
        }));
    }
    projectIsSimulatable(handle, modelName) {
        return this.sendRequest((requestId) => ({
            type: 'projectIsSimulatable',
            requestId,
            handle,
            modelName,
        }));
    }
    projectSerializeProtobuf(handle) {
        return this.sendRequest((requestId) => ({
            type: 'projectSerializeProtobuf',
            requestId,
            handle,
        }));
    }
    projectSerializeJson(handle, format, includeStdlib = false) {
        return this.sendRequest((requestId) => ({
            type: 'projectSerializeJson',
            requestId,
            handle,
            format,
            includeStdlib,
        }));
    }
    projectSerializeXmile(handle) {
        return this.sendRequest((requestId) => ({
            type: 'projectSerializeXmile',
            requestId,
            handle,
        }));
    }
    projectRenderSvg(handle, modelName) {
        return this.sendRequest((requestId) => ({
            type: 'projectRenderSvg',
            requestId,
            handle,
            modelName,
        }));
    }
    projectRenderPng(handle, modelName, width, height) {
        return this.sendRequest((requestId) => ({
            type: 'projectRenderPng',
            requestId,
            handle,
            modelName,
            width,
            height,
        }));
    }
    projectGetErrors(handle) {
        return this.sendRequest((requestId) => ({
            type: 'projectGetErrors',
            requestId,
            handle,
        }));
    }
    projectApplyPatch(handle, patch, dryRun, allowErrors) {
        return this.sendRequest((requestId) => ({
            type: 'projectApplyPatch',
            requestId,
            handle,
            patchJson: JSON.stringify(patch),
            dryRun,
            allowErrors,
        }));
    }
    modelGetName(handle) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetName',
            requestId,
            handle,
        }));
    }
    modelDispose(handle) {
        return this.sendRequest((requestId) => ({
            type: 'modelDispose',
            requestId,
            handle,
        }));
    }
    modelGetIncomingLinks(handle, varName) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetIncomingLinks',
            requestId,
            handle,
            varName,
        }));
    }
    modelGetLinks(handle) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetLinks',
            requestId,
            handle,
        }));
    }
    modelGetLoops(handle) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetLoops',
            requestId,
            handle,
        }));
    }
    modelGetLatexEquation(handle, ident) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetLatexEquation',
            requestId,
            handle,
            ident,
        }));
    }
    modelGetVarJson(handle, varName) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetVarJson',
            requestId,
            handle,
            varName,
        }));
    }
    modelGetVarNames(handle, typeMask = 0, filter = null) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetVarNames',
            requestId,
            handle,
            typeMask,
            filter,
        }));
    }
    modelGetSimSpecsJson(handle) {
        return this.sendRequest((requestId) => ({
            type: 'modelGetSimSpecsJson',
            requestId,
            handle,
        }));
    }
    simNew(modelHandle, enableLtm, engine) {
        return this.sendRequest((requestId) => ({
            type: 'simNew',
            requestId,
            modelHandle,
            enableLtm,
            engine,
        }));
    }
    simDispose(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simDispose',
            requestId,
            handle,
        }));
    }
    simRunTo(handle, time) {
        return this.sendRequest((requestId) => ({
            type: 'simRunTo',
            requestId,
            handle,
            time,
        }));
    }
    simRunToEnd(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simRunToEnd',
            requestId,
            handle,
        }));
    }
    simReset(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simReset',
            requestId,
            handle,
        }));
    }
    simGetTime(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simGetTime',
            requestId,
            handle,
        }));
    }
    simGetStepCount(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simGetStepCount',
            requestId,
            handle,
        }));
    }
    simGetValue(handle, name) {
        return this.sendRequest((requestId) => ({
            type: 'simGetValue',
            requestId,
            handle,
            name,
        }));
    }
    simSetValue(handle, name, value) {
        return this.sendRequest((requestId) => ({
            type: 'simSetValue',
            requestId,
            handle,
            name,
            value,
        }));
    }
    simGetSeries(handle, name) {
        return this.sendRequest((requestId) => ({
            type: 'simGetSeries',
            requestId,
            handle,
            name,
        }));
    }
    simGetVarNames(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simGetVarNames',
            requestId,
            handle,
        }));
    }
    simGetLinks(handle) {
        return this.sendRequest((requestId) => ({
            type: 'simGetLinks',
            requestId,
            handle,
        }));
    }
}
//# sourceMappingURL=worker-backend.js.map