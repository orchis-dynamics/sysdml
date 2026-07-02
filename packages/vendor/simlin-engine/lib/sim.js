"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sim = void 0;
const run_1 = require("./run");
class Sim {
    constructor(handle, model, overrides, enableLtm) {
        this._disposed = false;
        this._handle = handle;
        this._model = model;
        this._overrides = { ...overrides };
        this._enableLtm = enableLtm;
    }
    static async create(model, overrides = {}, enableLtm = false, engine = 'vm') {
        if (model.project === null) {
            throw new Error('Model is not attached to a Project');
        }
        const backend = model.project.backend;
        const handle = await backend.simNew(model.handle, enableLtm, engine);
        for (const [name, value] of Object.entries(overrides)) {
            await backend.simSetValue(handle, name, value);
        }
        return new Sim(handle, model, overrides, enableLtm);
    }
    get handle() {
        this.checkDisposed();
        return this._handle;
    }
    get model() {
        return this._model;
    }
    get overrides() {
        return { ...this._overrides };
    }
    get ltmEnabled() {
        return this._enableLtm;
    }
    get backend() {
        if (this._model.project === null) {
            throw new Error('Model is not attached to a Project');
        }
        return this._model.project.backend;
    }
    checkDisposed() {
        if (this._disposed) {
            throw new Error('Sim has been disposed');
        }
    }
    async time() {
        this.checkDisposed();
        return await this.backend.simGetTime(this._handle);
    }
    async runTo(time) {
        this.checkDisposed();
        await this.backend.simRunTo(this._handle, time);
    }
    async runToEnd() {
        this.checkDisposed();
        await this.backend.simRunToEnd(this._handle);
    }
    async reset() {
        this.checkDisposed();
        await this.backend.simReset(this._handle);
        for (const [name, value] of Object.entries(this._overrides)) {
            await this.backend.simSetValue(this._handle, name, value);
        }
    }
    async getStepCount() {
        this.checkDisposed();
        return await this.backend.simGetStepCount(this._handle);
    }
    async getValue(name) {
        this.checkDisposed();
        return await this.backend.simGetValue(this._handle, name);
    }
    async setValue(name, value) {
        this.checkDisposed();
        await this.backend.simSetValue(this._handle, name, value);
    }
    async getSeries(name) {
        this.checkDisposed();
        return await this.backend.simGetSeries(this._handle, name);
    }
    async getVarNames() {
        this.checkDisposed();
        return await this.backend.simGetVarNames(this._handle);
    }
    async getLinks() {
        this.checkDisposed();
        return await this.backend.simGetLinks(this._handle);
    }
    async getRun() {
        this.checkDisposed();
        const varNames = await this.getVarNames();
        const allNames = varNames.includes('time') ? varNames : [...varNames, 'time'];
        const seriesArrays = await Promise.all(allNames.map((name) => this.getSeries(name)));
        const results = new Map();
        for (let i = 0; i < allNames.length; i++) {
            results.set(allNames[i], seriesArrays[i]);
        }
        const wantLinks = this.ltmEnabled;
        const [loops, links, stepCount] = await Promise.all([
            this._model.loops(),
            wantLinks ? this.getLinks() : Promise.resolve([]),
            this.getStepCount(),
        ]);
        return new run_1.Run({
            varNames,
            results,
            loops,
            links,
            stepCount,
            overrides: this.overrides,
        });
    }
    async dispose() {
        if (this._disposed) {
            return;
        }
        await this.backend.simDispose(this._handle);
        this._disposed = true;
    }
    [Symbol.dispose]() {
        if (this._disposed) {
            return;
        }
        const result = this.backend.simDispose(this._handle);
        if (result instanceof Promise) {
            result.catch((e) => console.warn('Sim dispose failed:', e));
        }
        this._disposed = true;
    }
}
exports.Sim = Sim;
//# sourceMappingURL=sim.js.map