"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimlinUnitErrorKind = exports.SimlinErrorKind = exports.ErrorCode = exports.errorCodeDescription = exports.ModelPatchBuilder = exports.Run = exports.Sim = exports.SIMLIN_VARTYPE_MODULE = exports.SIMLIN_VARTYPE_AUX = exports.SIMLIN_VARTYPE_FLOW = exports.SIMLIN_VARTYPE_STOCK = exports.Model = exports.Project = void 0;
exports.configureWasm = configureWasm;
exports.ready = ready;
exports.isReady = isReady;
exports.resetWasm = resetWasm;
var project_1 = require("./project");
Object.defineProperty(exports, "Project", { enumerable: true, get: function () { return project_1.Project; } });
var model_1 = require("./model");
Object.defineProperty(exports, "Model", { enumerable: true, get: function () { return model_1.Model; } });
Object.defineProperty(exports, "SIMLIN_VARTYPE_STOCK", { enumerable: true, get: function () { return model_1.SIMLIN_VARTYPE_STOCK; } });
Object.defineProperty(exports, "SIMLIN_VARTYPE_FLOW", { enumerable: true, get: function () { return model_1.SIMLIN_VARTYPE_FLOW; } });
Object.defineProperty(exports, "SIMLIN_VARTYPE_AUX", { enumerable: true, get: function () { return model_1.SIMLIN_VARTYPE_AUX; } });
Object.defineProperty(exports, "SIMLIN_VARTYPE_MODULE", { enumerable: true, get: function () { return model_1.SIMLIN_VARTYPE_MODULE; } });
var sim_1 = require("./sim");
Object.defineProperty(exports, "Sim", { enumerable: true, get: function () { return sim_1.Sim; } });
var run_1 = require("./run");
Object.defineProperty(exports, "Run", { enumerable: true, get: function () { return run_1.Run; } });
var patch_1 = require("./patch");
Object.defineProperty(exports, "ModelPatchBuilder", { enumerable: true, get: function () { return patch_1.ModelPatchBuilder; } });
var errors_1 = require("./errors");
Object.defineProperty(exports, "errorCodeDescription", { enumerable: true, get: function () { return errors_1.errorCodeDescription; } });
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return errors_1.ErrorCode; } });
__exportStar(require("./types"), exports);
__exportStar(require("./json-types"), exports);
var types_1 = require("./internal/types");
Object.defineProperty(exports, "SimlinErrorKind", { enumerable: true, get: function () { return types_1.SimlinErrorKind; } });
Object.defineProperty(exports, "SimlinUnitErrorKind", { enumerable: true, get: function () { return types_1.SimlinUnitErrorKind; } });
const backend_factory_1 = require("@simlin/engine/internal/backend-factory");
function configureWasm(config) {
    (0, backend_factory_1.getBackend)().configureWasm(config);
}
async function ready(wasmSource) {
    await (0, backend_factory_1.getBackend)().init(wasmSource);
}
function isReady() {
    return (0, backend_factory_1.getBackend)().isInitialized();
}
async function resetWasm() {
    await (0, backend_factory_1.getBackend)().reset();
}
//# sourceMappingURL=index.js.map