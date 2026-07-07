import { WorkerBackend } from './worker-backend';
import { spawnWithTrampoline } from './worker-trampoline';
let sharedBackend = null;
let sharedWorker = null;
let sharedWorkerBlobUrl = null;
function releaseWorkerBlobUrl() {
    if (sharedWorkerBlobUrl !== null) {
        URL.revokeObjectURL(sharedWorkerBlobUrl);
        sharedWorkerBlobUrl = null;
    }
}
function spawnBundledWorker() {
    return new Worker(new URL('./engine-worker.js', import.meta.url), {
        type: 'module',
    });
}
function bundlerPublicPath() {
    return typeof __webpack_public_path__ === 'string' ? __webpack_public_path__ : undefined;
}
function pageOrigin() {
    return typeof self !== 'undefined' && self.location ? self.location.origin : undefined;
}
function createWorkerBackend() {
    const spawned = spawnWithTrampoline(globalThis, spawnBundledWorker, {
        pageOrigin: pageOrigin(),
        publicPath: bundlerPublicPath(),
    });
    const worker = spawned.worker;
    sharedWorker = worker;
    sharedWorkerBlobUrl = spawned.blobUrl;
    const backend = new WorkerBackend((msg, transfer) => {
        if (transfer && transfer.length > 0) {
            worker.postMessage(msg, transfer);
        }
        else {
            worker.postMessage(msg);
        }
    }, (callback) => {
        worker.onmessage = (event) => {
            releaseWorkerBlobUrl();
            callback(event.data);
        };
    });
    worker.onerror = (event) => {
        event.preventDefault();
        releaseWorkerBlobUrl();
        const error = new Error(`Worker error: ${event.message}`);
        backend.handleWorkerError(error);
        sharedBackend = null;
        sharedWorker = null;
        worker.terminate();
    };
    return backend;
}
export function getBackend() {
    if (!sharedBackend) {
        sharedBackend = createWorkerBackend();
    }
    return sharedBackend;
}
export function resetBackend() {
    if (sharedBackend) {
        sharedBackend.terminate();
        sharedBackend = null;
    }
    if (sharedWorker) {
        sharedWorker.terminate();
        sharedWorker = null;
    }
    releaseWorkerBlobUrl();
}
//# sourceMappingURL=backend-factory.browser.js.map