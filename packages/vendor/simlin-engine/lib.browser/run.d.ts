import { Link, Loop } from './types';
export interface RunData {
    varNames: string[];
    results: Map<string, Float64Array>;
    loops: readonly Loop[];
    links: readonly Link[];
    stepCount: number;
    overrides: Record<string, number>;
}
export declare class Run {
    private _varNames;
    private _results;
    private _loops;
    private _links;
    private _stepCount;
    private _overrides;
    constructor(data: RunData);
    get overrides(): Record<string, number>;
    get varNames(): readonly string[];
    get results(): ReadonlyMap<string, Float64Array>;
    getSeries(name: string): Float64Array;
    get time(): Float64Array;
    get loops(): readonly Loop[];
    get links(): readonly Link[];
    get stepCount(): number;
}
//# sourceMappingURL=run.d.ts.map