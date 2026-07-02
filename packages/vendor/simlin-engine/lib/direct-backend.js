"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectBackend = void 0;
const project_1 = require("./internal/project");
const import_export_1 = require("./internal/import-export");
const model_1 = require("./internal/model");
const sim_1 = require("./internal/sim");
const analysis_1 = require("./internal/analysis");
const error_1 = require("./internal/error");
const wasmgen_1 = require("./internal/wasmgen");
const canonicalize_1 = require("./internal/canonicalize");
const types_1 = require("./internal/types");
const types_2 = require("./types");
const wasm_1 = require("@simlin/engine/internal/wasm");
function compareByCodePoint(a, b) {
    const ai = a[Symbol.iterator]();
    const bi = b[Symbol.iterator]();
    for (;;) {
        const an = ai.next();
        const bn = bi.next();
        if (an.done || bn.done) {
            return an.done ? (bn.done ? 0 : -1) : 1;
        }
        const ac = an.value.codePointAt(0);
        const bc = bn.value.codePointAt(0);
        if (ac !== bc) {
            return ac - bc;
        }
    }
}
function convertLinkPolarity(raw) {
    switch (raw) {
        case types_1.SimlinLinkPolarity.Positive:
            return types_2.LinkPolarity.Positive;
        case types_1.SimlinLinkPolarity.Negative:
            return types_2.LinkPolarity.Negative;
        case types_1.SimlinLinkPolarity.Unknown:
            return types_2.LinkPolarity.Unknown;
        default:
            throw new Error(`Invalid link polarity value: ${raw}`);
    }
}
function convertLinks(linksPtr) {
    if (linksPtr === 0) {
        return [];
    }
    let links = [];
    try {
        const rawLinks = (0, analysis_1.readLinks)(linksPtr);
        links = rawLinks.map((link) => ({
            from: link.from,
            to: link.to,
            polarity: convertLinkPolarity(link.polarity),
            score: link.score ?? undefined,
        }));
    }
    finally {
        (0, analysis_1.simlin_free_links)(linksPtr);
    }
    return links;
}
class DirectBackend {
    constructor() {
        this._nextHandle = 1;
        this._handles = new Map();
        this._projectChildren = new Map();
    }
    allocHandle(kind, ptr, extra) {
        const handle = this._nextHandle++;
        this._handles.set(handle, {
            kind,
            ptr,
            disposed: false,
            projectHandle: extra?.projectHandle,
            engine: extra?.engine,
            wasmInstance: extra?.wasmInstance,
            wasmLayout: extra?.wasmLayout,
            wasmExports: extra?.wasmExports,
            wasmStopTime: extra?.wasmStopTime,
            wasmModelPtr: extra?.wasmModelPtr,
            wasmLayoutBytes: extra?.wasmLayoutBytes,
        });
        if (kind === 'project') {
            this._projectChildren.set(handle, new Set());
        }
        else if (extra?.projectHandle !== undefined) {
            this._projectChildren.get(extra.projectHandle)?.add(handle);
        }
        return handle;
    }
    getEntry(handle, expectedKind) {
        const entry = this._handles.get(handle);
        if (!entry) {
            throw new Error(`Handle ${handle} does not exist`);
        }
        if (entry.disposed) {
            throw new Error(`Handle ${handle} has been disposed`);
        }
        if (entry.kind !== expectedKind) {
            throw new Error(`Handle ${handle} is a ${entry.kind}, expected ${expectedKind}`);
        }
        return entry;
    }
    getProjectPtr(handle) {
        return this.getEntry(handle, 'project').ptr;
    }
    getModelPtr(handle) {
        return this.getEntry(handle, 'model').ptr;
    }
    async init(wasmSource) {
        await (0, wasm_1.ensureInitialized)(wasmSource);
    }
    isInitialized() {
        return (0, wasm_1.isInitialized)();
    }
    reset() {
        for (const [, entry] of this._handles) {
            entry.disposed = true;
        }
        this._handles.clear();
        this._projectChildren.clear();
        this._nextHandle = 1;
        (0, wasm_1.reset)();
    }
    configureWasm(config) {
        (0, wasm_1.configureWasm)(config);
    }
    projectOpenXmile(data) {
        const ptr = (0, import_export_1.simlin_project_open_xmile)(data);
        return this.allocHandle('project', ptr);
    }
    projectOpenProtobuf(data) {
        const ptr = (0, project_1.simlin_project_open_protobuf)(data);
        return this.allocHandle('project', ptr);
    }
    projectOpenJson(data, format) {
        const ptr = (0, project_1.simlin_project_open_json)(data, format);
        return this.allocHandle('project', ptr);
    }
    projectOpenVensim(data) {
        const ptr = (0, import_export_1.simlin_project_open_vensim)(data);
        return this.allocHandle('project', ptr);
    }
    projectDispose(handle) {
        const entry = this._handles.get(handle);
        if (!entry || entry.disposed) {
            return;
        }
        const children = this._projectChildren.get(handle);
        if (children) {
            for (const childHandle of children) {
                const childEntry = this._handles.get(childHandle);
                if (childEntry && !childEntry.disposed) {
                    childEntry.disposed = true;
                    if (childEntry.kind === 'sim') {
                        if (childEntry.engine === 'wasm') {
                            this.releaseWasmSimState(childEntry);
                        }
                        else {
                            (0, sim_1.simlin_sim_unref)(childEntry.ptr);
                        }
                    }
                    else if (childEntry.kind === 'model') {
                        (0, model_1.simlin_model_unref)(childEntry.ptr);
                    }
                }
            }
            this._projectChildren.delete(handle);
        }
        entry.disposed = true;
        (0, project_1.simlin_project_unref)(entry.ptr);
    }
    projectGetModelCount(handle) {
        return (0, project_1.simlin_project_get_model_count)(this.getProjectPtr(handle));
    }
    projectGetModelNames(handle) {
        return (0, project_1.simlin_project_get_model_names)(this.getProjectPtr(handle));
    }
    projectGetModel(handle, name) {
        const ptr = (0, project_1.simlin_project_get_model)(this.getProjectPtr(handle), name);
        return this.allocHandle('model', ptr, { projectHandle: handle });
    }
    projectIsSimulatable(handle, modelName) {
        return (0, project_1.simlin_project_is_simulatable)(this.getProjectPtr(handle), modelName);
    }
    projectSerializeProtobuf(handle) {
        return (0, project_1.simlin_project_serialize_protobuf)(this.getProjectPtr(handle));
    }
    projectSerializeJson(handle, format, includeStdlib = false) {
        return (0, project_1.simlin_project_serialize_json)(this.getProjectPtr(handle), format, includeStdlib);
    }
    projectSerializeXmile(handle) {
        return (0, import_export_1.simlin_project_serialize_xmile)(this.getProjectPtr(handle));
    }
    projectRenderSvg(handle, modelName) {
        return (0, import_export_1.simlin_project_render_svg)(this.getProjectPtr(handle), modelName);
    }
    projectRenderPng(handle, modelName, width, height) {
        return (0, import_export_1.simlin_project_render_png)(this.getProjectPtr(handle), modelName, width, height);
    }
    projectGetErrors(handle) {
        const errPtr = (0, project_1.simlin_project_get_errors)(this.getProjectPtr(handle));
        if (errPtr === 0) {
            return [];
        }
        const details = (0, error_1.readAllErrorDetails)(errPtr);
        (0, error_1.simlin_error_free)(errPtr);
        return details;
    }
    projectApplyPatch(handle, patch, dryRun, allowErrors) {
        const patchJson = JSON.stringify(patch);
        const patchBytes = new TextEncoder().encode(patchJson);
        const collectedPtr = (0, project_1.simlin_project_apply_patch)(this.getProjectPtr(handle), patchBytes, dryRun, allowErrors);
        if (collectedPtr === 0) {
            return [];
        }
        const details = (0, error_1.readAllErrorDetails)(collectedPtr);
        (0, error_1.simlin_error_free)(collectedPtr);
        return details;
    }
    modelGetName(handle) {
        return (0, model_1.simlin_model_get_name)(this.getModelPtr(handle));
    }
    modelDispose(handle) {
        const entry = this._handles.get(handle);
        if (!entry || entry.disposed) {
            return;
        }
        entry.disposed = true;
        if (entry.projectHandle !== undefined) {
            this._projectChildren.get(entry.projectHandle)?.delete(handle);
        }
        (0, model_1.simlin_model_unref)(entry.ptr);
    }
    modelGetIncomingLinks(handle, varName) {
        return (0, model_1.simlin_model_get_incoming_links)(this.getModelPtr(handle), varName);
    }
    modelGetLinks(handle) {
        const linksPtr = (0, model_1.simlin_model_get_links)(this.getModelPtr(handle));
        return convertLinks(linksPtr);
    }
    modelGetLoops(handle) {
        const loopsPtr = (0, analysis_1.simlin_analyze_get_loops)(this.getModelPtr(handle));
        if (loopsPtr === 0) {
            return [];
        }
        let loops = [];
        try {
            const rawLoops = (0, analysis_1.readLoops)(loopsPtr);
            loops = rawLoops.map((loop) => ({
                id: loop.id,
                variables: loop.variables,
                polarity: loop.polarity,
            }));
        }
        finally {
            (0, analysis_1.simlin_free_loops)(loopsPtr);
        }
        return loops;
    }
    modelGetLatexEquation(handle, ident) {
        return (0, model_1.simlin_model_get_latex_equation)(this.getModelPtr(handle), ident);
    }
    modelGetVarJson(handle, varName) {
        return (0, model_1.simlin_model_get_var_json)(this.getModelPtr(handle), varName);
    }
    modelGetVarNames(handle, typeMask = 0, filter = null) {
        return (0, model_1.simlin_model_get_var_names)(this.getModelPtr(handle), typeMask, filter);
    }
    modelGetSimSpecsJson(handle) {
        return (0, model_1.simlin_model_get_sim_specs_json)(this.getModelPtr(handle));
    }
    simNew(modelHandle, enableLtm, engine = 'vm') {
        const modelEntry = this.getEntry(modelHandle, 'model');
        if (engine === 'wasm') {
            return this.simNewWasm(modelHandle, modelEntry, enableLtm);
        }
        const ptr = (0, sim_1.simlin_sim_new)(modelEntry.ptr, enableLtm);
        return this.allocHandle('sim', ptr, {
            projectHandle: modelEntry.projectHandle,
            engine: 'vm',
        });
    }
    simNewWasm(modelHandle, modelEntry, enableLtm) {
        const { wasm, layout } = (0, wasmgen_1.simlin_model_compile_to_wasm)(modelEntry.ptr, enableLtm);
        const parsed = (0, wasmgen_1.parseWasmLayout)(layout);
        const specs = JSON.parse(new TextDecoder().decode(this.modelGetSimSpecsJson(modelHandle)));
        const wasmStopTime = specs.endTime ?? 10;
        const wasmBytes = wasm.buffer;
        const instance = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {});
        const wasmExports = instance.exports;
        (0, model_1.simlin_model_ref)(modelEntry.ptr);
        return this.allocHandle('sim', 0, {
            projectHandle: modelEntry.projectHandle,
            engine: 'wasm',
            wasmInstance: instance,
            wasmLayout: parsed,
            wasmExports,
            wasmStopTime,
            wasmModelPtr: modelEntry.ptr,
            wasmLayoutBytes: layout,
        });
    }
    releaseWasmSimState(entry) {
        if (entry.wasmModelPtr !== undefined) {
            (0, model_1.simlin_model_unref)(entry.wasmModelPtr);
            entry.wasmModelPtr = undefined;
        }
        entry.wasmInstance = undefined;
        entry.wasmExports = undefined;
        entry.wasmLayout = undefined;
        entry.wasmLayoutBytes = undefined;
    }
    simDispose(handle) {
        const entry = this._handles.get(handle);
        if (!entry || entry.disposed) {
            return;
        }
        entry.disposed = true;
        if (entry.projectHandle !== undefined) {
            this._projectChildren.get(entry.projectHandle)?.delete(handle);
        }
        if (entry.engine === 'wasm') {
            this.releaseWasmSimState(entry);
        }
        else {
            (0, sim_1.simlin_sim_unref)(entry.ptr);
        }
    }
    wasmSlot(layout, name) {
        const slot = layout.varOffsets.get((0, canonicalize_1.canonicalizeIdent)(name));
        if (slot === undefined) {
            throw new Error(`unknown variable: ${name}`);
        }
        return slot;
    }
    simRunTo(handle, time) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            entry.wasmExports.run_to(time);
            return;
        }
        (0, sim_1.simlin_sim_run_to)(entry.ptr, time);
    }
    simRunToEnd(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            entry.wasmExports.run_to(entry.wasmStopTime);
            return;
        }
        (0, sim_1.simlin_sim_run_to_end)(entry.ptr);
    }
    simReset(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            entry.wasmExports.reset();
            return;
        }
        (0, sim_1.simlin_sim_reset)(entry.ptr);
    }
    simGetTime(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            return new DataView(entry.wasmExports.memory.buffer).getFloat64(0, true);
        }
        return (0, sim_1.simlin_sim_get_value)(entry.ptr, 'time');
    }
    simGetStepCount(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            return Number(entry.wasmExports.saved_steps.value);
        }
        return (0, sim_1.simlin_sim_get_stepcount)(entry.ptr);
    }
    simGetValue(handle, name) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const slot = this.wasmSlot(entry.wasmLayout, name);
            return new DataView(entry.wasmExports.memory.buffer).getFloat64(slot * 8, true);
        }
        return (0, sim_1.simlin_sim_get_value)(entry.ptr, name);
    }
    simSetValue(handle, name, value) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const slot = this.wasmSlot(entry.wasmLayout, name);
            const rc = entry.wasmExports.set_value(slot, value);
            if (rc !== 0) {
                throw new Error(`cannot set value of '${name}': not a simple constant`);
            }
            return;
        }
        (0, sim_1.simlin_sim_set_value)(entry.ptr, name, value);
    }
    simGetSeries(handle, name) {
        const entry = this.getEntry(handle, 'sim');
        const stepCount = this.simGetStepCount(handle);
        if (entry.engine === 'wasm') {
            const slot = this.wasmSlot(entry.wasmLayout, name);
            return (0, wasmgen_1.readStridedSeries)(entry.wasmExports.memory.buffer, entry.wasmLayout, slot, stepCount);
        }
        return (0, sim_1.simlin_sim_get_series)(entry.ptr, name, stepCount);
    }
    simGetVarNames(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const names = Array.from(entry.wasmLayout.varOffsets.keys()).filter((n) => !n.startsWith('$'));
            names.sort(compareByCodePoint);
            return names;
        }
        return (0, sim_1.simlin_sim_get_var_names)(entry.ptr);
    }
    simGetLinks(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const { resultsOffset, nSlots } = entry.wasmLayout;
            const savedSteps = this.simGetStepCount(handle);
            const slabBytes = new Uint8Array(entry.wasmExports.memory.buffer, resultsOffset, savedSteps * nSlots * 8).slice();
            const linksPtr = (0, analysis_1.simlin_analyze_links_from_wasm_results)(entry.wasmModelPtr, slabBytes, entry.wasmLayoutBytes);
            return convertLinks(linksPtr);
        }
        const linksPtr = (0, analysis_1.simlin_analyze_get_links)(entry.ptr);
        return convertLinks(linksPtr);
    }
}
exports.DirectBackend = DirectBackend;
//# sourceMappingURL=direct-backend.js.map