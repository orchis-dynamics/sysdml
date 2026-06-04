import { SimlinModelPtr, SimlinSimPtr } from './types';
export declare function simlin_sim_new(model: SimlinModelPtr, enableLtm: boolean): SimlinSimPtr;
export declare function simlin_sim_ref(sim: SimlinSimPtr): void;
export declare function simlin_sim_unref(sim: SimlinSimPtr): void;
export declare function simlin_sim_run_to(sim: SimlinSimPtr, time: number): void;
export declare function simlin_sim_run_to_end(sim: SimlinSimPtr): void;
export declare function simlin_sim_reset(sim: SimlinSimPtr): void;
export declare function simlin_sim_get_stepcount(sim: SimlinSimPtr): number;
export declare function simlin_sim_get_value(sim: SimlinSimPtr, name: string): number;
export declare function simlin_sim_set_value(sim: SimlinSimPtr, name: string, value: number): void;
export declare function simlin_sim_get_series(sim: SimlinSimPtr, name: string, stepCount: number): Float64Array;
export declare function simlin_sim_set_value_by_offset(sim: SimlinSimPtr, offset: number, value: number): void;
export declare function simlin_sim_get_offset(sim: SimlinSimPtr, name: string): number;
export declare function simlin_sim_get_var_count(sim: SimlinSimPtr): number;
export declare function simlin_sim_get_var_names(sim: SimlinSimPtr): string[];
//# sourceMappingURL=sim.d.ts.map