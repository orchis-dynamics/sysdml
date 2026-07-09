---
"@sysdml/simulator": patch
---

Bundle the vendored `@simlin/engine` build (JS + both WASM binaries) directly
into `@sysdml/simulator`'s published package. External consumers can now
`npm install @sysdml/simulator` (and transitively `@sysdml/renderer`) with no
`@simlin/engine` registry entry, no peer dependency, and no Rust/WASM
toolchain. The `@simlin/engine` peerDependency is removed; it is now a
build-time-only devDependency. Note: the published tarball grows substantially
because it embeds the engine `lib`/`lib.browser` output and two WASM binaries
(~11 MB uncompressed across both `libsimlin.wasm` and `libsimlin-browser.wasm`).
