"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFinalizer = registerFinalizer;
exports.unregisterFinalizer = unregisterFinalizer;
const FinalizationRegistryImpl = globalThis
    .FinalizationRegistry;
const registry = FinalizationRegistryImpl
    ? new FinalizationRegistryImpl((held) => {
        try {
            held.dispose(held.ptr);
        }
        catch {
        }
    })
    : null;
function registerFinalizer(owner, ptr, dispose) {
    registry?.register(owner, { ptr, dispose }, owner);
}
function unregisterFinalizer(owner) {
    registry?.unregister(owner);
}
//# sourceMappingURL=dispose.js.map