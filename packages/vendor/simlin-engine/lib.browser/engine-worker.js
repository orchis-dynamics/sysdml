import { ENGINE_PUBLIC_PATH_GLOBAL } from './worker-trampoline';
const workerSelf = self;
const publicPathOverride = self[ENGINE_PUBLIC_PATH_GLOBAL];
if (typeof publicPathOverride === 'string' && typeof __webpack_public_path__ === 'string') {
    __webpack_public_path__ = publicPathOverride;
}
let pendingMessages = [];
workerSelf.onmessage = (event) => {
    if (pendingMessages !== null) {
        pendingMessages.push(event.data);
    }
};
import('./worker-server')
    .then(({ WorkerServer }) => {
    const server = new WorkerServer((msg, transfer) => {
        if (transfer && transfer.length > 0) {
            workerSelf.postMessage(msg, transfer);
        }
        else {
            workerSelf.postMessage(msg);
        }
    });
    const buffered = pendingMessages;
    pendingMessages = null;
    for (const msg of buffered) {
        server.handleMessage(msg);
    }
    workerSelf.onmessage = (event) => {
        server.handleMessage(event.data);
    };
})
    .catch((err) => {
    const buffered = pendingMessages ?? [];
    pendingMessages = null;
    const errorMsg = err instanceof Error ? err.message : String(err);
    for (const msg of buffered) {
        const req = msg;
        if (typeof req.requestId === 'number') {
            workerSelf.postMessage({
                type: 'error',
                requestId: req.requestId,
                error: { name: 'Error', message: `Worker initialization failed: ${errorMsg}` },
            });
        }
    }
    workerSelf.onmessage = (event) => {
        const req = event.data;
        if (typeof req.requestId === 'number') {
            workerSelf.postMessage({
                type: 'error',
                requestId: req.requestId,
                error: { name: 'Error', message: `Worker initialization failed: ${errorMsg}` },
            });
        }
    };
});
//# sourceMappingURL=engine-worker.js.map