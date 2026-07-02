import { Ptr, SimlinErrorPtr, SimlinErrorCode, ErrorDetail } from './types';
export declare function simlin_error_str(code: SimlinErrorCode): string;
export declare function simlin_error_free(err: SimlinErrorPtr): void;
export declare function simlin_error_get_code(err: SimlinErrorPtr): SimlinErrorCode;
export declare function simlin_error_get_message(err: SimlinErrorPtr): string | null;
export declare function simlin_error_get_detail_count(err: SimlinErrorPtr): number;
export declare function simlin_error_get_details(err: SimlinErrorPtr): Ptr;
export declare function simlin_error_get_detail(err: SimlinErrorPtr, index: number): Ptr;
export declare function readErrorDetail(ptr: Ptr): ErrorDetail;
export declare function readAllErrorDetails(err: SimlinErrorPtr): ErrorDetail[];
export declare class SimlinError extends Error {
    code: SimlinErrorCode;
    details: ErrorDetail[];
    constructor(message: string, code: SimlinErrorCode, details?: ErrorDetail[]);
}
//# sourceMappingURL=error.d.ts.map