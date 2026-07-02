import { EngineBackend, ProjectHandle } from './backend';
import { SimlinJsonFormat, ErrorDetail } from './internal/types';
import { WasmSourceProvider } from '@simlin/engine/internal/wasm';
import { Model } from './model';
import { JsonProjectPatch } from './json-types';
type ProjectOpenOptions = {
    wasm?: WasmSourceProvider;
};
type ProjectOpenJsonOptions = ProjectOpenOptions & {
    format?: SimlinJsonFormat;
};
export declare class Project {
    private _handle;
    private _backend;
    private _disposed;
    private _models;
    private _mainModel;
    constructor(handle: ProjectHandle, backend: EngineBackend);
    static open(xmile: string | Uint8Array, options?: ProjectOpenOptions): Promise<Project>;
    static openProtobuf(data: Uint8Array, options?: ProjectOpenOptions): Promise<Project>;
    static openJson(data: string | Uint8Array, options?: ProjectOpenJsonOptions): Promise<Project>;
    static openVensim(data: string | Uint8Array, options?: ProjectOpenOptions): Promise<Project>;
    get handle(): ProjectHandle;
    get backend(): EngineBackend;
    get isDisposed(): boolean;
    private checkDisposed;
    modelCount(): Promise<number>;
    getModelNames(): Promise<string[]>;
    mainModel(): Promise<Model>;
    getModel(name: string | null): Promise<Model>;
    models(): Promise<readonly Model[]>;
    isSimulatable(modelName?: string | null): Promise<boolean>;
    serializeProtobuf(): Promise<Uint8Array>;
    serializeJson(format?: SimlinJsonFormat, includeStdlib?: boolean): Promise<string>;
    toXmile(): Promise<Uint8Array>;
    toXmileString(): Promise<string>;
    renderSvg(modelName: string): Promise<Uint8Array>;
    renderSvgString(modelName: string): Promise<string>;
    renderPng(modelName: string, width?: number, height?: number): Promise<Uint8Array>;
    getErrors(): Promise<ErrorDetail[]>;
    applyPatch(patch: JsonProjectPatch, options?: {
        dryRun?: boolean;
        allowErrors?: boolean;
    }): Promise<ErrorDetail[]>;
    dispose(): Promise<void>;
    [Symbol.dispose](): void;
}
export {};
//# sourceMappingURL=project.d.ts.map