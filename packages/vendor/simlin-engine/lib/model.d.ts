import { ModelHandle, SimEngine } from './backend';
import { Variable, TimeSpec, Link, Loop, ModelIssue } from './types';
import { JsonStock, JsonFlow, JsonAuxiliary } from './json-types';
import { Project } from './project';
import { Sim } from './sim';
import { Run } from './run';
import { ModelPatchBuilder } from './patch';
export declare const SIMLIN_VARTYPE_STOCK: number;
export declare const SIMLIN_VARTYPE_FLOW: number;
export declare const SIMLIN_VARTYPE_AUX: number;
export declare const SIMLIN_VARTYPE_MODULE: number;
export declare class Model {
    private _handle;
    private _project;
    private _name;
    private _disposed;
    private _cachedBaseCase;
    constructor(handle: ModelHandle, project: Project | null, name: string | null);
    get handle(): ModelHandle;
    get project(): Project | null;
    get name(): string | null;
    private get backend();
    private checkDisposed;
    invalidateCaches(): void;
    getVariable(name: string): Promise<Variable | undefined>;
    getVarNames(typeMask?: number, filter?: string | null): Promise<string[]>;
    timeSpec(): Promise<TimeSpec>;
    loops(): Promise<readonly Loop[]>;
    getIncomingLinks(varName: string): Promise<string[]>;
    getLinks(): Promise<Link[]>;
    explain(variable: string): Promise<string>;
    getLatexEquation(ident: string): Promise<string | null>;
    check(): Promise<ModelIssue[]>;
    simulate(overrides?: Record<string, number>, options?: {
        enableLtm?: boolean;
        engine?: SimEngine;
    }): Promise<Sim>;
    run(overrides?: Record<string, number>, options?: {
        analyzeLtm?: boolean;
        engine?: SimEngine;
    }): Promise<Run>;
    baseCase(): Promise<Run>;
    edit(callback: (currentVars: Record<string, JsonStock | JsonFlow | JsonAuxiliary>, patch: ModelPatchBuilder) => void, options?: {
        dryRun?: boolean;
        allowErrors?: boolean;
    }): Promise<void>;
    dispose(): Promise<void>;
    [Symbol.dispose](): void;
}
//# sourceMappingURL=model.d.ts.map