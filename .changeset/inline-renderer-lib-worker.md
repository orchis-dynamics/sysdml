---
"@sysdml/renderer": patch
---

Inline the simulation worker into the published `./lib` bundle so external
Vite/webpack consumers no longer 404 on a separate worker asset. The worker
(with its WASM) is now embedded in `lib.js` as a blob, making the library
self-contained at the cost of a larger `lib.js` (~6.8 MB).
