# @sysdml/renderer

## 0.1.2

### Patch Changes

- b6f9251: Inline the simulation worker into the published `./lib` bundle so external
  Vite/webpack consumers no longer 404 on a separate worker asset. The worker
  (with its WASM) is now embedded in `lib.js` as a blob, making the library
  self-contained at the cost of a larger `lib.js` (~6.8 MB).
  - @sysdml/contracts@0.1.2
  - @sysdml/layout@0.1.2
  - @sysdml/simulator@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [f44df0b]
  - @sysdml/simulator@0.1.1
  - @sysdml/contracts@0.1.1
  - @sysdml/layout@0.1.1
