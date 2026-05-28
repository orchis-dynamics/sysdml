# @sysdml/renderer

Vue 3 + Vite renderer for SysDML stock-and-flow diagrams. Consumes a compiled `@sysdml/ir` model and renders the diagram on an SVG canvas, with a Web Worker running `@sysdml/simulator` alongside so simulation output is available as reactive state.

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## How it's embedded

The renderer is a self-contained Vite app that takes an `IR` from a transport and draws the diagram. Three transports ship today:

| Mode | Transport | How IR arrives |
| --- | --- | --- |
| VS Code webview | `PostMessageAdapter` | Extension fetches IR from the LSP server and `postMessage`s `{type:"update", ir}` |
| `pnpm dev` browser | `WebSocketAdapter` | Vite plugin `sysdml-dev` watches `SYSDML_FILE`, parses + compiles in Node, broadcasts over a WebSocket |
| Headless / no transport | `NullAdapter` | Empty canvas |

Selection is automatic — `createTransport()` in `src/transport/index.ts` picks the right adapter based on the host environment.

## Simulation

The renderer runs `@sysdml/simulator` in a dedicated Web Worker (`src/simulation/worker.ts`), bundled by Vite as a separate hashed same-origin asset (`?worker`). The worker is loaded relative to the main bundle via `import.meta.url` — no `blob:` URLs, no inline base64. This pattern is safe under strict `require-trusted-types-for 'script'` CSP enforcement (planned for the hosted Monaco demo).

Whenever a new IR arrives via the transport, `App.vue` calls `simulator.simulate(ir)` and the result lands in two reactive refs:

- `simulation: Ref<SimulationResult | null>` — the simulator's output: `rows` (per-step values keyed by IR identifier) and `diagnostics` (warnings or halt codes from `SimDiagnosticCode`)
- `simulationError: Ref<string | null>` — an unexpected JS exception thrown by the simulator (rare — programmer errors, malformed IR)

Halted simulations (e.g. `MATH_DOMAIN_ERROR`) appear as entries in `simulation.value.diagnostics`, not as `simulationError`. The simulator folds its own `SimulationHaltedError` into the diagnostics array internally.

Stale results from rapid IR updates are discarded by job ID — only the most recent simulation reaches the reactive state. This is handled inside `SimulatorClient` (`src/simulation/client.ts`).

### Trusted Types policy

A Trusted Types `default` policy is registered at app boot (`src/security/trusted-types.ts`, called from `main.ts`) to validate every script URL that reaches `new Worker(...)` and similar APIs. The allowlist accepts same-origin `https?://`, `vscode-webview-resource://`, and relative paths ending in `.js`; everything else (including `blob:`, `data:`, and `javascript:`) is rejected. In environments without Trusted Types (most current browsers) the policy is a no-op; under enforced CSP it provides a runtime tripwire against any future code path that would try to load a worker from an untrusted URL.

### Reusing the simulator outside the Vue app

The simulator client is decoupled from the transport, so the module is structured to be lifted into a standalone package (or into a future browser-only Monaco demo) without changes. Today there is no public `exports` entry — consumers inside the monorepo import from `./src/simulation/client.js` directly; this path will be promoted to a proper subpath export once an external consumer materialises.

```ts
import { createDefaultSimulatorClient } from "./src/simulation/client.js";

const simulator = createDefaultSimulatorClient();
simulator.onResult((result) => { /* ... */ });
simulator.onError((message) => { /* ... */ });
simulator.simulate(ir);
// later:
simulator.dispose();
```

`createDefaultSimulatorClient()` instantiates the inlined worker; the underlying `SimulatorClient` class also accepts a custom `WorkerFactory` for testing.

## Development

```sh
# build
pnpm --filter @sysdml/renderer build

# run dev server against an example model
SYSDML_FILE="$(pwd)/models/examples/population_growth.sysdml" pnpm --filter @sysdml/renderer dev

# tests (vitest)
pnpm --filter @sysdml/renderer test
```

The dev server serves the renderer at `http://localhost:5173` and watches the configured `SYSDML_FILE` for changes, broadcasting IR updates over the WebSocket transport.

---

## Credits

Code and documentation co-authored with [Claude Sonnet](https://anthropic.com) and [Claude Opus](https://anthropic.com) by Anthropic.
