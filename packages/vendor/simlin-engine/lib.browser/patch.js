export class ModelPatchBuilder {
    constructor(modelName) {
        this._ops = [];
        this._modelName = modelName;
    }
    get modelName() {
        return this._modelName;
    }
    hasOperations() {
        return this._ops.length > 0;
    }
    get operationCount() {
        return this._ops.length;
    }
    build() {
        return {
            name: this._modelName,
            ops: [...this._ops],
        };
    }
    upsertStock(stock) {
        const op = { type: 'upsertStock', payload: { stock } };
        this._ops.push(op);
        return stock;
    }
    upsertFlow(flow) {
        const op = { type: 'upsertFlow', payload: { flow } };
        this._ops.push(op);
        return flow;
    }
    upsertAux(aux) {
        const op = { type: 'upsertAux', payload: { aux } };
        this._ops.push(op);
        return aux;
    }
    upsertModule(module) {
        const op = { type: 'upsertModule', payload: { module } };
        this._ops.push(op);
        return module;
    }
    deleteVariable(ident) {
        const op = { type: 'deleteVariable', payload: { ident } };
        this._ops.push(op);
    }
    renameVariable(currentIdent, newIdent) {
        const op = { type: 'renameVariable', payload: { from: currentIdent, to: newIdent } };
        this._ops.push(op);
    }
    upsertView(index, view) {
        const op = { type: 'upsertView', payload: { index, view } };
        this._ops.push(op);
        return view;
    }
    deleteView(index) {
        const op = { type: 'deleteView', payload: { index } };
        this._ops.push(op);
    }
}
//# sourceMappingURL=patch.js.map