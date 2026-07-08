# @sysdml/layout

Layout engine for SysDML stock-and-flow diagrams. Takes a compiled `@sysdml/ir` model and computes 2D positions and routing for stocks, flows, auxiliaries, and connections — the pure-geometry step between "here's a model" and "here's where to draw it."

> Part of the [SysDML monorepo](../../README.md). See the root README for the overall architecture and how the packages fit together.

## What it exports

- `layout-engine.js` — the main entry point that turns an IR model into positioned diagram elements
- `layout-edges.js` — connection/flow routing between positioned elements
- `layout-auxiliaries.js` — placement of auxiliary variables relative to the elements that reference them
- `missing-positions.js` — fills in positions for elements the source model didn't specify
- `geometry.js` — shared geometric primitives (points, boxes, routing math)
- `layout-types.js` — TypeScript types for the layout output
- `layout-theme.js` — sizing/spacing constants used by the layout algorithm

`@sysdml/renderer` is the primary consumer — it calls into this package to position the diagram before drawing it on the SVG canvas.

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
