import { SimHandle, SimEngine } from './backend';
import { Link } from './types';
import { Model } from './model';
import { Run } from './run';
export declare class Sim {
    private _handle;
    private _model;
    private _overrides;
    private _disposed;
    private _enableLtm;
    private constructor();
    static create(model: Model, overrides?: Record<string, number>, enableLtm?: boolean, engine?: SimEngine): Promise<Sim>;
    get handle(): SimHandle;
    get model(): Model;
    get overrides(): Record<string, number>;
    get ltmEnabled(): boolean;
    private get backend();
    private checkDisposed;
    time(): Promise<number>;
    runTo(time: number): Promise<void>;
    runToEnd(): Promise<void>;
    reset(): Promise<void>;
    getStepCount(): Promise<number>;
    getValue(name: string): Promise<number>;
    setValue(name: string, value: number): Promise<void>;
    getSeries(name: string): Promise<Float64Array>;
    getVarNames(): Promise<string[]>;
    getLinks(): Promise<Link[]>;
    getRun(): Promise<Run>;
    dispose(): Promise<void>;
    [Symbol.dispose](): void;
}
//# sourceMappingURL=sim.d.ts.map