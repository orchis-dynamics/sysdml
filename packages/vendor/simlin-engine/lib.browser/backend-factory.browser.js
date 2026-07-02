import { WorkerBackend } from './worker-backend';
let sharedBackend = null;
let sharedWorker = null;
function createWorkerBackend() {
    const worker = new Worker(new URL('./engine-worker.js', import.meta.url), {
        type: 'module',
    });
    sharedWorker = worker;
    const backend = new WorkerBackend((msg, transfer) => {
        if (transfer && transfer.length > 0) {
            worker.postMessage(msg, transfer);
        }
        else {
            worker.postMessage(msg);
        }
    }, (callback) => {
        worker.onmessage = (event) => {
            callback(event.data);
        };
    });
    worker.onerror = (event) => {
        event.preventDefault();
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
}
//# sourceMappingURL=backend-factory.browser.js.map