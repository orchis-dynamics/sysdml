"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackend = getBackend;
exports.resetBackend = resetBackend;
const direct_backend_1 = require("./direct-backend");
let sharedBackend = null;
function getBackend() {
    if (!sharedBackend) {
        sharedBackend = new direct_backend_1.DirectBackend();
    }
    return sharedBackend;
}
function resetBackend() {
    sharedBackend = null;
}
//# sourceMappingURL=backend-factory.node.js.map