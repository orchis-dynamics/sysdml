"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const backend_factory_1 = require("@simlin/engine/internal/backend-factory");
const types_1 = require("./internal/types");
const model_1 = require("./model");
class Project {
    constructor(handle, backend) {
        this._disposed = false;
        this._models = new Map();
        this._mainModel = null;
        this._handle = handle;
        this._backend = backend;
    }
    static async open(xmile, options = {}) {
        const backend = (0, backend_factory_1.getBackend)();
        await backend.init(options.wasm);
        const data = typeof xmile === 'string' ? new TextEncoder().encode(xmile) : xmile;
        const handle = await backend.projectOpenXmile(data);
        return new Project(handle, backend);
    }
    static async openProtobuf(data, options = {}) {
        const backend = (0, backend_factory_1.getBackend)();
        await backend.init(options.wasm);
        const handle = await backend.projectOpenProtobuf(data);
        return new Project(handle, backend);
    }
    static async openJson(data, options = {}) {
        const backend = (0, backend_factory_1.getBackend)();
        await backend.init(options.wasm);
        const format = options.format ?? types_1.SimlinJsonFormat.Native;
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const handle = await backend.projectOpenJson(bytes, format);
        return new Project(handle, backend);
    }
    static async openVensim(data, options = {}) {
        const backend = (0, backend_factory_1.getBackend)();
        await backend.init(options.wasm);
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const handle = await backend.projectOpenVensim(bytes);
        return new Project(handle, backend);
    }
    get handle() {
        this.checkDisposed();
        return this._handle;
    }
    get backend() {
        return this._backend;
    }
    get isDisposed() {
        return this._disposed;
    }
    checkDisposed() {
        if (this._disposed) {
            throw new Error('Project has been disposed');
        }
    }
    async modelCount() {
        this.checkDisposed();
        return await this._backend.projectGetModelCount(this._handle);
    }
    async getModelNames() {
        this.checkDisposed();
        return await this._backend.projectGetModelNames(this._handle);
    }
    async mainModel() {
        this.checkDisposed();
        if (this._mainModel === null) {
            this._mainModel = await this.getModel(null);
        }
        return this._mainModel;
    }
    async getModel(name) {
        this.checkDisposed();
        const cacheKey = name ?? '';
        const cached = this._models.get(cacheKey);
        if (cached) {
            return cached;
        }
        const modelHandle = await this._backend.projectGetModel(this._handle, name);
        const resolvedName = await this._backend.modelGetName(modelHandle);
        const model = new model_1.Model(modelHandle, this, resolvedName);
        this._models.set(cacheKey, model);
        return model;
    }
    async models() {
        this.checkDisposed();
        const names = await this.getModelNames();
        const models = [];
        for (const name of names) {
            models.push(await this.getModel(name));
        }
        return models;
    }
    async isSimulatable(modelName = null) {
        this.checkDisposed();
        return await this._backend.projectIsSimulatable(this._handle, modelName);
    }
    async serializeProtobuf() {
        this.checkDisposed();
        return await this._backend.projectSerializeProtobuf(this._handle);
    }
    async serializeJson(format = types_1.SimlinJsonFormat.Native, includeStdlib = false) {
        this.checkDisposed();
        const bytes = await this._backend.projectSerializeJson(this._handle, format, includeStdlib);
        return new TextDecoder().decode(bytes);
    }
    async toXmile() {
        this.checkDisposed();
        return await this._backend.projectSerializeXmile(this._handle);
    }
    async toXmileString() {
        return new TextDecoder().decode(await this.toXmile());
    }
    async renderSvg(modelName) {
        this.checkDisposed();
        return await this._backend.projectRenderSvg(this._handle, modelName);
    }
    async renderSvgString(modelName) {
        return new TextDecoder().decode(await this.renderSvg(modelName));
    }
    async renderPng(modelName, width = 0, height = 0) {
        this.checkDisposed();
        return await this._backend.projectRenderPng(this._handle, modelName, width, height);
    }
    async getErrors() {
        this.checkDisposed();
        return await this._backend.projectGetErrors(this._handle);
    }
    async applyPatch(patch, options = {}) {
        this.checkDisposed();
        const { dryRun = false, allowErrors = false } = options;
        const errors = await this._backend.projectApplyPatch(this._handle, patch, dryRun, allowErrors);
        if (!dryRun) {
            for (const model of this._models.values()) {
                model.invalidateCaches();
            }
        }
        return errors;
    }
    async dispose() {
        if (this._disposed) {
            return;
        }
        for (const model of this._models.values()) {
            await model.dispose();
        }
        this._models.clear();
        this._mainModel = null;
        await this._backend.projectDispose(this._handle);
        this._disposed = true;
    }
    [Symbol.dispose]() {
        if (this._disposed) {
            return;
        }
        for (const model of this._models.values()) {
            model[Symbol.dispose]();
        }
        this._models.clear();
        this._mainModel = null;
        const result = this._backend.projectDispose(this._handle);
        if (result instanceof Promise) {
            result.catch((e) => console.warn('Project dispose failed:', e));
        }
        this._disposed = true;
    }
}
exports.Project = Project;
//# sourceMappingURL=project.js.map