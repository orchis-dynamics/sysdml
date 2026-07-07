"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = exports.SIMLIN_VARTYPE_MODULE = exports.SIMLIN_VARTYPE_AUX = exports.SIMLIN_VARTYPE_FLOW = exports.SIMLIN_VARTYPE_STOCK = void 0;
const types_1 = require("./internal/types");
const errors_1 = require("./errors");
const sim_1 = require("./sim");
const patch_1 = require("./patch");
function parseDt(dt) {
    if (!dt || dt.trim() === '') {
        return 1;
    }
    const trimmed = dt.trim();
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 2) {
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }
    }
    const value = parseFloat(trimmed);
    return isNaN(value) ? 1 : value;
}
function canonicalizeModelName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '_');
}
exports.SIMLIN_VARTYPE_STOCK = 1 << 0;
exports.SIMLIN_VARTYPE_FLOW = 1 << 1;
exports.SIMLIN_VARTYPE_AUX = 1 << 2;
exports.SIMLIN_VARTYPE_MODULE = 1 << 3;
function parseJsonGraphicalFunction(gf) {
    let points;
    let yPoints;
    if (gf.points && gf.points.length > 0) {
        points = gf.points;
    }
    else if (gf.yPoints && gf.yPoints.length > 0) {
        yPoints = gf.yPoints;
    }
    return {
        points,
        yPoints,
        xScale: gf.xScale ? { min: gf.xScale.min, max: gf.xScale.max } : undefined,
        yScale: gf.yScale ? { min: gf.yScale.min, max: gf.yScale.max } : undefined,
        kind: gf.kind,
    };
}
function extractEquation(topLevel, arrayed) {
    if (topLevel) {
        return topLevel;
    }
    if (arrayed?.equation) {
        return arrayed.equation;
    }
    return '';
}
function extractStockInitialEquation(topLevel, arrayed) {
    if (topLevel) {
        return topLevel;
    }
    if (arrayed?.equation) {
        return arrayed.equation;
    }
    return '';
}
function jsonVarToVariable(v) {
    switch (v.type) {
        case 'stock': {
            const s = {
                type: 'stock',
                name: v.name,
                initialEquation: extractStockInitialEquation(v.initialEquation, v.arrayedEquation),
                inflows: v.inflows || [],
                outflows: v.outflows || [],
                units: v.units || undefined,
                documentation: v.documentation || undefined,
                arrayedEquation: v.arrayedEquation,
                compat: v.compat || undefined,
            };
            return s;
        }
        case 'flow': {
            let gf;
            if (v.graphicalFunction) {
                gf = parseJsonGraphicalFunction(v.graphicalFunction);
            }
            const f = {
                type: 'flow',
                name: v.name,
                equation: extractEquation(v.equation, v.arrayedEquation),
                units: v.units || undefined,
                documentation: v.documentation || undefined,
                graphicalFunction: gf,
                arrayedEquation: v.arrayedEquation,
                compat: v.compat || undefined,
            };
            return f;
        }
        case 'aux': {
            let gf;
            if (v.graphicalFunction) {
                gf = parseJsonGraphicalFunction(v.graphicalFunction);
            }
            const a = {
                type: 'aux',
                name: v.name,
                equation: extractEquation(v.equation, v.arrayedEquation),
                units: v.units || undefined,
                documentation: v.documentation || undefined,
                graphicalFunction: gf,
                arrayedEquation: v.arrayedEquation,
                compat: v.compat || undefined,
            };
            return a;
        }
        case 'module': {
            const m = {
                type: 'module',
                name: v.name,
                modelName: v.modelName,
                compat: v.compat || undefined,
            };
            return m;
        }
    }
}
class Model {
    constructor(handle, project, name) {
        this._disposed = false;
        this._cachedBaseCase = null;
        this._handle = handle;
        this._project = project;
        this._name = name;
    }
    get handle() {
        this.checkDisposed();
        return this._handle;
    }
    get project() {
        return this._project;
    }
    get name() {
        return this._name;
    }
    get backend() {
        if (this._project === null) {
            throw new Error('Model is not attached to a Project');
        }
        return this._project.backend;
    }
    checkDisposed() {
        if (this._disposed) {
            throw new Error('Model has been disposed');
        }
    }
    invalidateCaches() {
        this._cachedBaseCase = null;
    }
    async getVariable(name) {
        this.checkDisposed();
        try {
            const bytes = await this.backend.modelGetVarJson(this._handle, name);
            const jsonVar = JSON.parse(new TextDecoder().decode(bytes));
            return jsonVarToVariable(jsonVar);
        }
        catch (e) {
            const code = e.code;
            if (code === errors_1.ErrorCode.DoesNotExist) {
                return undefined;
            }
            throw e;
        }
    }
    async getVarNames(typeMask = 0, filter = null) {
        this.checkDisposed();
        return await this.backend.modelGetVarNames(this._handle, typeMask, filter);
    }
    async timeSpec() {
        this.checkDisposed();
        const bytes = await this.backend.modelGetSimSpecsJson(this._handle);
        const simSpecs = JSON.parse(new TextDecoder().decode(bytes));
        return {
            start: simSpecs.startTime ?? 0,
            stop: simSpecs.endTime ?? 10,
            dt: parseDt(simSpecs.dt ?? '1'),
            units: simSpecs.timeUnits || undefined,
        };
    }
    async loops() {
        this.checkDisposed();
        return await this.backend.modelGetLoops(this._handle);
    }
    async getIncomingLinks(varName) {
        this.checkDisposed();
        return await this.backend.modelGetIncomingLinks(this._handle, varName);
    }
    async getLinks() {
        this.checkDisposed();
        return await this.backend.modelGetLinks(this._handle);
    }
    async explain(variable) {
        this.checkDisposed();
        const v = await this.getVariable(variable);
        if (v === undefined) {
            throw new Error(`Variable '${variable}' not found in model`);
        }
        switch (v.type) {
            case 'stock': {
                const inflowsStr = v.inflows.length > 0 ? v.inflows.join(', ') : 'no inflows';
                const outflowsStr = v.outflows.length > 0 ? v.outflows.join(', ') : 'no outflows';
                return `${v.name} is a stock with initial value ${v.initialEquation}, increased by ${inflowsStr}, decreased by ${outflowsStr}`;
            }
            case 'flow':
                return `${v.name} is a flow computed as ${v.equation}`;
            case 'aux':
                if (v.compat?.activeInitial) {
                    return `${v.name} is an auxiliary variable computed as ${v.equation} with initial value ${v.compat.activeInitial}`;
                }
                return `${v.name} is an auxiliary variable computed as ${v.equation}`;
            case 'module':
                return `${v.name} is a module instantiating model ${v.modelName}`;
        }
    }
    async getLatexEquation(ident) {
        this.checkDisposed();
        return await this.backend.modelGetLatexEquation(this._handle, ident);
    }
    async check() {
        this.checkDisposed();
        if (this._project === null) {
            return [];
        }
        const errorDetails = await this._project.getErrors();
        let actualModelName = this._name;
        if (actualModelName === null) {
            const names = await this._project.getModelNames();
            if (names.length > 0) {
                actualModelName = names[0];
            }
        }
        if (actualModelName === null) {
            return [];
        }
        const canonicalName = canonicalizeModelName(actualModelName);
        const modelErrors = errorDetails.filter((detail) => {
            if (!detail.modelName) {
                return false;
            }
            return canonicalizeModelName(detail.modelName) === canonicalName;
        });
        return modelErrors.map((detail) => ({
            severity: detail.severity === types_1.SimlinErrorSeverity.Warning ? 'warning' : 'error',
            message: detail.message || 'Unknown error',
            variable: detail.variableName || undefined,
            suggestion: undefined,
        }));
    }
    async simulate(overrides = {}, options = {}) {
        this.checkDisposed();
        const { enableLtm = false, engine = 'vm' } = options;
        return sim_1.Sim.create(this, overrides, enableLtm, engine);
    }
    async run(overrides = {}, options = {}) {
        this.checkDisposed();
        const { analyzeLtm = false, engine = 'vm' } = options;
        const sim = await this.simulate(overrides, { enableLtm: analyzeLtm, engine });
        await sim.runToEnd();
        return await sim.getRun();
    }
    async baseCase() {
        this.checkDisposed();
        if (this._cachedBaseCase === null) {
            this._cachedBaseCase = await this.run();
        }
        return this._cachedBaseCase;
    }
    async edit(callback, options = {}) {
        this.checkDisposed();
        if (this._project === null) {
            throw new Error('Model is not attached to a Project');
        }
        const { dryRun = false, allowErrors = false } = options;
        const varNames = await this.getVarNames(exports.SIMLIN_VARTYPE_STOCK | exports.SIMLIN_VARTYPE_FLOW | exports.SIMLIN_VARTYPE_AUX);
        const currentVars = {};
        for (const name of varNames) {
            const bytes = await this.backend.modelGetVarJson(this._handle, name);
            const v = JSON.parse(new TextDecoder().decode(bytes));
            switch (v.type) {
                case 'stock':
                    currentVars[v.name] = v;
                    break;
                case 'flow':
                    currentVars[v.name] = v;
                    break;
                case 'aux':
                    currentVars[v.name] = v;
                    break;
            }
        }
        let modelName = this._name;
        if (modelName === null) {
            const names = await this._project.getModelNames();
            if (names.length === 0) {
                throw new Error('No models in project');
            }
            modelName = names[0];
        }
        const patch = new patch_1.ModelPatchBuilder(modelName);
        callback(currentVars, patch);
        if (!patch.hasOperations()) {
            return;
        }
        const projectPatch = {
            models: [patch.build()],
        };
        await this._project.applyPatch(projectPatch, { dryRun, allowErrors });
        if (!dryRun) {
            this.invalidateCaches();
        }
    }
    async dispose() {
        if (this._disposed) {
            return;
        }
        await this.backend.modelDispose(this._handle);
        this._disposed = true;
    }
    [Symbol.dispose]() {
        if (this._disposed) {
            return;
        }
        const result = this.backend.modelDispose(this._handle);
        if (result instanceof Promise) {
            result.catch((e) => console.warn('Model dispose failed:', e));
        }
        this._disposed = true;
    }
}
exports.Model = Model;
//# sourceMappingURL=model.js.map