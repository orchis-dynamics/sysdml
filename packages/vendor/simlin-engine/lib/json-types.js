"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUpsertStock = isUpsertStock;
exports.isUpsertFlow = isUpsertFlow;
exports.isUpsertAux = isUpsertAux;
exports.isUpsertModule = isUpsertModule;
exports.isDeleteVariable = isDeleteVariable;
exports.isRenameVariable = isRenameVariable;
exports.isUpsertView = isUpsertView;
exports.isDeleteView = isDeleteView;
exports.isUpdateStockFlows = isUpdateStockFlows;
exports.isSetSimSpecs = isSetSimSpecs;
exports.isAddModel = isAddModel;
function isUpsertStock(op) {
    return op.type === 'upsertStock';
}
function isUpsertFlow(op) {
    return op.type === 'upsertFlow';
}
function isUpsertAux(op) {
    return op.type === 'upsertAux';
}
function isUpsertModule(op) {
    return op.type === 'upsertModule';
}
function isDeleteVariable(op) {
    return op.type === 'deleteVariable';
}
function isRenameVariable(op) {
    return op.type === 'renameVariable';
}
function isUpsertView(op) {
    return op.type === 'upsertView';
}
function isDeleteView(op) {
    return op.type === 'deleteView';
}
function isUpdateStockFlows(op) {
    return op.type === 'updateStockFlows';
}
function isSetSimSpecs(op) {
    return op.type === 'setSimSpecs';
}
function isAddModel(op) {
    return op.type === 'addModel';
}
//# sourceMappingURL=json-types.js.map