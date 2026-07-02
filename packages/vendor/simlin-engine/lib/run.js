"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Run = void 0;
class Run {
    constructor(data) {
        this._varNames = data.varNames;
        this._results = data.results;
        this._loops = data.loops;
        this._links = data.links;
        this._stepCount = data.stepCount;
        this._overrides = { ...data.overrides };
    }
    get overrides() {
        return { ...this._overrides };
    }
    get varNames() {
        return this._varNames;
    }
    get results() {
        return this._results;
    }
    getSeries(name) {
        const series = this._results.get(name);
        if (!series) {
            throw new Error(`Variable '${name}' not found in run results`);
        }
        return series;
    }
    get time() {
        return this.getSeries('time');
    }
    get loops() {
        return this._loops;
    }
    get links() {
        return this._links;
    }
    get stepCount() {
        return this._stepCount;
    }
}
exports.Run = Run;
//# sourceMappingURL=run.js.map