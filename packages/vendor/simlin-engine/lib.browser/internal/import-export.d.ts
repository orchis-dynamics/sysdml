import { SimlinProjectPtr } from './types';
export declare function simlin_project_open_xmile(data: Uint8Array): SimlinProjectPtr;
export declare function simlin_project_open_vensim(data: Uint8Array): SimlinProjectPtr;
export declare function simlin_project_serialize_xmile(project: SimlinProjectPtr): Uint8Array;
export declare function simlin_project_render_svg(project: SimlinProjectPtr, modelName: string): Uint8Array;
export declare function simlin_project_render_png(project: SimlinProjectPtr, modelName: string, width: number, height: number): Uint8Array;
//# sourceMappingURL=import-export.d.ts.map