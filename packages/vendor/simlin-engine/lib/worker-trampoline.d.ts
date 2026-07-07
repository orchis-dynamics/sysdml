export type WorkerType = 'module' | 'classic';
export interface DirectPlan {
    readonly kind: 'direct';
}
export interface TrampolinePlan {
    readonly kind: 'trampoline';
    readonly source: string;
}
export type WorkerCreationPlan = DirectPlan | TrampolinePlan;
export declare const ENGINE_PUBLIC_PATH_GLOBAL = "__simlin_engine_public_path__";
export declare function isCrossOrigin(workerUrl: string, pageOrigin: string | null | undefined): boolean;
export declare function resolvePublicPathOverride(publicPath: string | undefined, workerUrl: string): string | undefined;
export declare function workerTrampolineSource(absUrl: string, workerType: WorkerType, publicPathOverride?: string): string;
export interface PlanWorkerCreationArgs {
    readonly workerUrl: string;
    readonly pageOrigin: string | null | undefined;
    readonly workerType: WorkerType;
    readonly publicPath?: string;
}
export declare function planWorkerCreation(args: PlanWorkerCreationArgs): WorkerCreationPlan;
export interface WorkerUrlFactory {
    createObjectURL(blob: Blob): string;
    revokeObjectURL(url: string): void;
}
export interface SpawnedWorker {
    readonly worker: Worker;
    readonly blobUrl: string | null;
}
export interface SpawnEnvironment {
    readonly pageOrigin: string | null | undefined;
    readonly publicPath?: string;
}
export declare function spawnWithTrampoline(globalScope: {
    Worker?: unknown;
}, spawn: () => Worker, env: SpawnEnvironment, urlFactory?: WorkerUrlFactory): SpawnedWorker;
//# sourceMappingURL=worker-trampoline.d.ts.map