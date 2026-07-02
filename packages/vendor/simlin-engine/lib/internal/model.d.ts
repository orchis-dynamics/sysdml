import { SimlinModelPtr, SimlinLinksPtr } from './types';
export declare function simlin_model_ref(model: SimlinModelPtr): void;
export declare function simlin_model_unref(model: SimlinModelPtr): void;
export declare function simlin_model_get_name(model: SimlinModelPtr): string;
export declare function simlin_model_get_var_count(model: SimlinModelPtr, typeMask?: number, filter?: string | null): number;
export declare function simlin_model_get_latex_equation(model: SimlinModelPtr, ident: string): string | null;
export declare function simlin_model_get_links(model: SimlinModelPtr): SimlinLinksPtr;
export declare function simlin_model_get_var_names(model: SimlinModelPtr, typeMask?: number, filter?: string | null): string[];
export declare function simlin_model_get_incoming_links(model: SimlinModelPtr, varName: string): string[];
export declare function simlin_model_get_var_json(model: SimlinModelPtr, varName: string): Uint8Array;
export declare function simlin_model_get_sim_specs_json(model: SimlinModelPtr): Uint8Array;
//# sourceMappingURL=model.d.ts.map