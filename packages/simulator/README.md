# @sysdml/simulator

Simulation backend for SysDML: compiles a `@sysdml/ir` model into a Simlin project JSON document and runs it through the vendored, Apache-2.0-licensed [Simlin](https://github.com/bpowers/simlin) engine (WebAssembly).

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## What it exports

- `SimlinSimulator` — runs a compiled model and produces simulation output
- `irToSimlinProject` — compiles a `@sysdml/ir` model into Simlin's project JSON format

## `@simlin/engine` peer dependency

This package does not bundle `@simlin/engine` as a regular dependency. It's a `peerDependency` — the consuming project must supply a compatible `@simlin/engine` itself. In this monorepo that's the vendored copy at `packages/vendor/simlin-engine` (kept in sync via `scripts/update-simlin.sh`); it is not published to npm.

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
