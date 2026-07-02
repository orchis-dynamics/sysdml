import { SimlinProjectPtr, SimlinModelPtr, SimlinErrorPtr, SimlinJsonFormat } from './types';
export declare function simlin_project_open_protobuf(data: Uint8Array): SimlinProjectPtr;
export declare function simlin_project_open_json(data: Uint8Array, format: SimlinJsonFormat): SimlinProjectPtr;
export declare function simlin_project_ref(project: SimlinProjectPtr): void;
export declare function simlin_project_unref(project: SimlinProjectPtr): void;
export declare function simlin_project_get_model_count(project: SimlinProjectPtr): number;
export declare function simlin_project_get_model_names(project: SimlinProjectPtr): string[];
export declare function simlin_project_get_model(project: SimlinProjectPtr, modelName: string | null): SimlinModelPtr;
export declare function simlin_project_serialize_protobuf(project: SimlinProjectPtr): Uint8Array;
export declare function simlin_project_serialize_json(project: SimlinProjectPtr, format: SimlinJsonFormat, includeStdlib?: boolean): Uint8Array;
export declare function simlin_project_is_simulatable(project: SimlinProjectPtr, modelName: string | null): boolean;
export declare function simlin_project_get_errors(project: SimlinProjectPtr): SimlinErrorPtr;
export declare function simlin_project_add_model(project: SimlinProjectPtr, modelName: string): void;
export declare function simlin_project_apply_patch(project: SimlinProjectPtr, patchData: Uint8Array, dryRun: boolean, allowErrors: boolean): SimlinErrorPtr;
//# sourceMappingURL=project.d.ts.map