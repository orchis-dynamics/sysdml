type Ptr = number;
type Finalizer = (ptr: Ptr) => void;
export declare function registerFinalizer(owner: object, ptr: Ptr, dispose: Finalizer): void;
export declare function unregisterFinalizer(owner: object): void;
export {};
//# sourceMappingURL=dispose.d.ts.map