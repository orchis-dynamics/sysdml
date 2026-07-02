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
export function registerFinalizer(owner, ptr, dispose) {
    registry?.register(owner, { ptr, dispose }, owner);
}
export function unregisterFinalizer(owner) {
    registry?.unregister(owner);
}
//# sourceMappingURL=dispose.js.map