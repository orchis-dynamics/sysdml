# Vendored @simlin/engine

Built from source and vendored by `scripts/update-simlin.sh`. Do not edit
by hand — rerun the script to update.

- Upstream: https://github.com/bpowers/simlin.git (`src/engine`)
- Commit: ffb667371870dc7ce261c5b04ca872eea89e62bc
- Package version: 2.0.0
- Vendored on: 2026-07-07
- License: Apache-2.0 (see LICENSE)
- Local transformations: `scripts` and `devDependencies` removed from
  package.json so workspace-wide `pnpm -r` commands and installs skip
  the upstream build/test tooling; `private: true` added so this vendored
  copy is never published to npm (it is bundled into `@sysdml/simulator`).
