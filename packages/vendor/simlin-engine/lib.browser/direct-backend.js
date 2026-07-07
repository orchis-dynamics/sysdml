import { simlin_project_open_protobuf, simlin_project_open_json, simlin_project_unref, simlin_project_get_model_count, simlin_project_get_model_names, simlin_project_get_model, simlin_project_serialize_protobuf, simlin_project_serialize_json, simlin_project_is_simulatable, simlin_project_get_errors, simlin_project_apply_patch, } from './internal/project';
import { simlin_project_open_xmile, simlin_project_open_vensim, simlin_project_serialize_xmile, simlin_project_render_svg, simlin_project_render_png, } from './internal/import-export';
import { simlin_model_ref, simlin_model_unref, simlin_model_get_name, simlin_model_get_incoming_links, simlin_model_get_links as simlin_model_get_links_fn, simlin_model_get_latex_equation, simlin_model_get_var_names, simlin_model_get_var_json, simlin_model_get_sim_specs_json, } from './internal/model';
import { simlin_sim_new, simlin_sim_unref, simlin_sim_run_to, simlin_sim_run_to_end, simlin_sim_reset, simlin_sim_get_stepcount, simlin_sim_get_value, simlin_sim_set_value, simlin_sim_get_series, simlin_sim_get_var_names as simlin_sim_get_var_names_fn, } from './internal/sim';
import { simlin_analyze_get_loops, simlin_analyze_get_links, simlin_analyze_links_from_wasm_results, readLoops, readLinks, simlin_free_loops, simlin_free_links, } from './internal/analysis';
import { readAllErrorDetails, simlin_error_free } from './internal/error';
import { simlin_model_compile_to_wasm, parseWasmLayout, readStridedSeries, } from './internal/wasmgen';
import { canonicalizeIdent } from './internal/canonicalize';
import { SimlinLinkPolarity, } from './internal/types';
import { LinkPolarity } from './types';
import { configureWasm as wasmConfigureWasm, ensureInitialized, isInitialized, reset as wasmReset, } from '@simlin/engine/internal/wasm';
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
        case SimlinLinkPolarity.Positive:
            return LinkPolarity.Positive;
        case SimlinLinkPolarity.Negative:
            return LinkPolarity.Negative;
        case SimlinLinkPolarity.Unknown:
            return LinkPolarity.Unknown;
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
        const rawLinks = readLinks(linksPtr);
        links = rawLinks.map((link) => ({
            from: link.from,
            to: link.to,
            polarity: convertLinkPolarity(link.polarity),
            score: link.score ?? undefined,
            relativeScore: link.relativeScore ?? undefined,
        }));
    }
    finally {
        simlin_free_links(linksPtr);
    }
    return links;
}
export class DirectBackend {
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
        await ensureInitialized(wasmSource);
    }
    isInitialized() {
        return isInitialized();
    }
    reset() {
        for (const [, entry] of this._handles) {
            entry.disposed = true;
        }
        this._handles.clear();
        this._projectChildren.clear();
        this._nextHandle = 1;
        wasmReset();
    }
    configureWasm(config) {
        wasmConfigureWasm(config);
    }
    projectOpenXmile(data) {
        const ptr = simlin_project_open_xmile(data);
        return this.allocHandle('project', ptr);
    }
    projectOpenProtobuf(data) {
        const ptr = simlin_project_open_protobuf(data);
        return this.allocHandle('project', ptr);
    }
    projectOpenJson(data, format) {
        const ptr = simlin_project_open_json(data, format);
        return this.allocHandle('project', ptr);
    }
    projectOpenVensim(data) {
        const ptr = simlin_project_open_vensim(data);
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
                            simlin_sim_unref(childEntry.ptr);
                        }
                    }
                    else if (childEntry.kind === 'model') {
                        simlin_model_unref(childEntry.ptr);
                    }
                }
            }
            this._projectChildren.delete(handle);
        }
        entry.disposed = true;
        simlin_project_unref(entry.ptr);
    }
    projectGetModelCount(handle) {
        return simlin_project_get_model_count(this.getProjectPtr(handle));
    }
    projectGetModelNames(handle) {
        return simlin_project_get_model_names(this.getProjectPtr(handle));
    }
    projectGetModel(handle, name) {
        const ptr = simlin_project_get_model(this.getProjectPtr(handle), name);
        return this.allocHandle('model', ptr, { projectHandle: handle });
    }
    projectIsSimulatable(handle, modelName) {
        return simlin_project_is_simulatable(this.getProjectPtr(handle), modelName);
    }
    projectSerializeProtobuf(handle) {
        return simlin_project_serialize_protobuf(this.getProjectPtr(handle));
    }
    projectSerializeJson(handle, format, includeStdlib = false) {
        return simlin_project_serialize_json(this.getProjectPtr(handle), format, includeStdlib);
    }
    projectSerializeXmile(handle) {
        return simlin_project_serialize_xmile(this.getProjectPtr(handle));
    }
    projectRenderSvg(handle, modelName) {
        return simlin_project_render_svg(this.getProjectPtr(handle), modelName);
    }
    projectRenderPng(handle, modelName, width, height) {
        return simlin_project_render_png(this.getProjectPtr(handle), modelName, width, height);
    }
    projectGetErrors(handle) {
        const errPtr = simlin_project_get_errors(this.getProjectPtr(handle));
        if (errPtr === 0) {
            return [];
        }
        const details = readAllErrorDetails(errPtr);
        simlin_error_free(errPtr);
        return details;
    }
    projectApplyPatch(handle, patch, dryRun, allowErrors) {
        const patchJson = JSON.stringify(patch);
        const patchBytes = new TextEncoder().encode(patchJson);
        const collectedPtr = simlin_project_apply_patch(this.getProjectPtr(handle), patchBytes, dryRun, allowErrors);
        if (collectedPtr === 0) {
            return [];
        }
        const details = readAllErrorDetails(collectedPtr);
        simlin_error_free(collectedPtr);
        return details;
    }
    modelGetName(handle) {
        return simlin_model_get_name(this.getModelPtr(handle));
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
        simlin_model_unref(entry.ptr);
    }
    modelGetIncomingLinks(handle, varName) {
        return simlin_model_get_incoming_links(this.getModelPtr(handle), varName);
    }
    modelGetLinks(handle) {
        const linksPtr = simlin_model_get_links_fn(this.getModelPtr(handle));
        return convertLinks(linksPtr);
    }
    modelGetLoops(handle) {
        const loopsPtr = simlin_analyze_get_loops(this.getModelPtr(handle));
        if (loopsPtr === 0) {
            return [];
        }
        let loops = [];
        try {
            const rawLoops = readLoops(loopsPtr);
            loops = rawLoops.map((loop) => ({
                id: loop.id,
                variables: loop.variables,
                polarity: loop.polarity,
                name: loop.name,
                polarityConfidence: loop.polarityConfidence,
                partition: loop.partition,
            }));
        }
        finally {
            simlin_free_loops(loopsPtr);
        }
        return loops;
    }
    modelGetLatexEquation(handle, ident) {
        return simlin_model_get_latex_equation(this.getModelPtr(handle), ident);
    }
    modelGetVarJson(handle, varName) {
        return simlin_model_get_var_json(this.getModelPtr(handle), varName);
    }
    modelGetVarNames(handle, typeMask = 0, filter = null) {
        return simlin_model_get_var_names(this.getModelPtr(handle), typeMask, filter);
    }
    modelGetSimSpecsJson(handle) {
        return simlin_model_get_sim_specs_json(this.getModelPtr(handle));
    }
    simNew(modelHandle, enableLtm, engine = 'vm') {
        const modelEntry = this.getEntry(modelHandle, 'model');
        if (engine === 'wasm') {
            return this.simNewWasm(modelHandle, modelEntry, enableLtm);
        }
        const ptr = simlin_sim_new(modelEntry.ptr, enableLtm);
        return this.allocHandle('sim', ptr, {
            projectHandle: modelEntry.projectHandle,
            engine: 'vm',
        });
    }
    simNewWasm(modelHandle, modelEntry, enableLtm) {
        const { wasm, layout } = simlin_model_compile_to_wasm(modelEntry.ptr, enableLtm);
        const parsed = parseWasmLayout(layout);
        const specs = JSON.parse(new TextDecoder().decode(this.modelGetSimSpecsJson(modelHandle)));
        const wasmStopTime = specs.endTime ?? 10;
        const wasmBytes = wasm.buffer;
        const instance = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {});
        const wasmExports = instance.exports;
        simlin_model_ref(modelEntry.ptr);
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
            simlin_model_unref(entry.wasmModelPtr);
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
            simlin_sim_unref(entry.ptr);
        }
    }
    wasmSlot(layout, name) {
        const slot = layout.varOffsets.get(canonicalizeIdent(name));
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
        simlin_sim_run_to(entry.ptr, time);
    }
    simRunToEnd(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            entry.wasmExports.run_to(entry.wasmStopTime);
            return;
        }
        simlin_sim_run_to_end(entry.ptr);
    }
    simReset(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            entry.wasmExports.reset();
            return;
        }
        simlin_sim_reset(entry.ptr);
    }
    simGetTime(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            return new DataView(entry.wasmExports.memory.buffer).getFloat64(0, true);
        }
        return simlin_sim_get_value(entry.ptr, 'time');
    }
    simGetStepCount(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            return Number(entry.wasmExports.saved_steps.value);
        }
        return simlin_sim_get_stepcount(entry.ptr);
    }
    simGetValue(handle, name) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const slot = this.wasmSlot(entry.wasmLayout, name);
            return new DataView(entry.wasmExports.memory.buffer).getFloat64(slot * 8, true);
        }
        return simlin_sim_get_value(entry.ptr, name);
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
        simlin_sim_set_value(entry.ptr, name, value);
    }
    simGetSeries(handle, name) {
        const entry = this.getEntry(handle, 'sim');
        const stepCount = this.simGetStepCount(handle);
        if (entry.engine === 'wasm') {
            const slot = this.wasmSlot(entry.wasmLayout, name);
            return readStridedSeries(entry.wasmExports.memory.buffer, entry.wasmLayout, slot, stepCount);
        }
        return simlin_sim_get_series(entry.ptr, name, stepCount);
    }
    simGetVarNames(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const names = Array.from(entry.wasmLayout.varOffsets.keys()).filter((n) => !n.startsWith('$'));
            names.sort(compareByCodePoint);
            return names;
        }
        return simlin_sim_get_var_names_fn(entry.ptr);
    }
    simGetLinks(handle) {
        const entry = this.getEntry(handle, 'sim');
        if (entry.engine === 'wasm') {
            const { resultsOffset, nSlots } = entry.wasmLayout;
            const savedSteps = this.simGetStepCount(handle);
            const slabBytes = new Uint8Array(entry.wasmExports.memory.buffer, resultsOffset, savedSteps * nSlots * 8).slice();
            const linksPtr = simlin_analyze_links_from_wasm_results(entry.wasmModelPtr, slabBytes, entry.wasmLayoutBytes);
            return convertLinks(linksPtr);
        }
        const linksPtr = simlin_analyze_get_links(entry.ptr);
        return convertLinks(linksPtr);
    }
}
//# sourceMappingURL=direct-backend.js.map