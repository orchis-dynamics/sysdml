export function isUpsertStock(op) {
    return op.type === 'upsertStock';
}
export function isUpsertFlow(op) {
    return op.type === 'upsertFlow';
}
export function isUpsertAux(op) {
    return op.type === 'upsertAux';
}
export function isUpsertModule(op) {
    return op.type === 'upsertModule';
}
export function isDeleteVariable(op) {
    return op.type === 'deleteVariable';
}
export function isRenameVariable(op) {
    return op.type === 'renameVariable';
}
export function isUpsertView(op) {
    return op.type === 'upsertView';
}
export function isDeleteView(op) {
    return op.type === 'deleteView';
}
export function isUpdateStockFlows(op) {
    return op.type === 'updateStockFlows';
}
export function isSetSimSpecs(op) {
    return op.type === 'setSimSpecs';
}
export function isAddModel(op) {
    return op.type === 'addModel';
}
//# sourceMappingURL=json-types.js.map