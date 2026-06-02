import { JsonStock, JsonFlow, JsonAuxiliary, JsonModule, JsonView, JsonModelPatch } from './json-types';
export declare class ModelPatchBuilder {
    private _modelName;
    private _ops;
    constructor(modelName: string);
    get modelName(): string;
    hasOperations(): boolean;
    get operationCount(): number;
    build(): JsonModelPatch;
    upsertStock(stock: JsonStock): JsonStock;
    upsertFlow(flow: JsonFlow): JsonFlow;
    upsertAux(aux: JsonAuxiliary): JsonAuxiliary;
    upsertModule(module: JsonModule): JsonModule;
    deleteVariable(ident: string): void;
    renameVariable(currentIdent: string, newIdent: string): void;
    upsertView(index: number, view: JsonView): JsonView;
    deleteView(index: number): void;
}
//# sourceMappingURL=patch.d.ts.map