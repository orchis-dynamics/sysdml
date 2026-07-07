export interface JsonGraphicalFunctionScale {
    min: number;
    max: number;
}
export interface JsonGraphicalFunction {
    points?: [number, number][];
    yPoints?: number[];
    kind?: string;
    xScale?: JsonGraphicalFunctionScale;
    yScale?: JsonGraphicalFunctionScale;
}
export interface JsonDataSource {
    kind: string;
    file: string;
    tabOrDelimiter: string;
    rowOrCol: string;
    cell: string;
}
export interface JsonCompat {
    activeInitial?: string;
    nonNegative?: boolean;
    canBeModuleInput?: boolean;
    isPublic?: boolean;
    dataSource?: JsonDataSource;
}
export interface JsonElementEquation {
    subscript: string;
    equation: string;
    compat?: JsonCompat;
    graphicalFunction?: JsonGraphicalFunction;
}
export interface JsonArrayedEquation {
    dimensions: string[];
    equation?: string;
    compat?: JsonCompat;
    elements?: JsonElementEquation[];
    hasExceptDefault?: boolean;
}
export interface JsonModuleReference {
    src: string;
    dst: string;
}
export interface JsonStock {
    name: string;
    inflows: string[];
    outflows: string[];
    uid?: number;
    initialEquation?: string;
    units?: string;
    documentation?: string;
    arrayedEquation?: JsonArrayedEquation;
    compat?: JsonCompat;
    nonNegative?: boolean;
    canBeModuleInput?: boolean;
    isPublic?: boolean;
}
export interface JsonFlow {
    name: string;
    uid?: number;
    equation?: string;
    units?: string;
    graphicalFunction?: JsonGraphicalFunction;
    documentation?: string;
    arrayedEquation?: JsonArrayedEquation;
    compat?: JsonCompat;
    nonNegative?: boolean;
    canBeModuleInput?: boolean;
    isPublic?: boolean;
}
export interface JsonAuxiliary {
    name: string;
    uid?: number;
    equation?: string;
    units?: string;
    graphicalFunction?: JsonGraphicalFunction;
    documentation?: string;
    arrayedEquation?: JsonArrayedEquation;
    compat?: JsonCompat;
    canBeModuleInput?: boolean;
    isPublic?: boolean;
}
export interface JsonModule {
    name: string;
    modelName: string;
    uid?: number;
    units?: string;
    documentation?: string;
    references?: JsonModuleReference[];
    compat?: JsonCompat;
    canBeModuleInput?: boolean;
    isPublic?: boolean;
}
export type JsonVariable = JsonStock | JsonFlow | JsonAuxiliary | JsonModule;
export interface JsonFlowPoint {
    x: number;
    y: number;
    attachedToUid?: number;
}
export interface JsonLinkPoint {
    x: number;
    y: number;
}
export interface JsonRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface JsonStockViewElement {
    type: 'stock';
    uid: number;
    name: string;
    x: number;
    y: number;
    labelSide?: string;
}
export interface JsonFlowViewElement {
    type: 'flow';
    uid: number;
    name: string;
    x: number;
    y: number;
    points: JsonFlowPoint[];
    labelSide?: string;
}
export interface JsonAuxiliaryViewElement {
    type: 'aux';
    uid: number;
    name: string;
    x: number;
    y: number;
    labelSide?: string;
}
export interface JsonCloudViewElement {
    type: 'cloud';
    uid: number;
    flowUid: number;
    x: number;
    y: number;
}
export interface JsonLinkViewElement {
    type: 'link';
    uid: number;
    fromUid: number;
    toUid: number;
    arc?: number;
    multiPoints?: JsonLinkPoint[];
    polarity?: string;
}
export interface JsonModuleViewElement {
    type: 'module';
    uid: number;
    name: string;
    x: number;
    y: number;
    labelSide?: string;
}
export interface JsonAliasViewElement {
    type: 'alias';
    uid: number;
    aliasOfUid: number;
    x: number;
    y: number;
    labelSide?: string;
}
export interface JsonGroupViewElement {
    type: 'group';
    uid: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export type JsonViewElement = JsonStockViewElement | JsonFlowViewElement | JsonAuxiliaryViewElement | JsonCloudViewElement | JsonLinkViewElement | JsonModuleViewElement | JsonAliasViewElement | JsonGroupViewElement;
export interface JsonView {
    elements: JsonViewElement[];
    kind?: string;
    viewBox?: JsonRect;
    zoom?: number;
    useLetteredPolarity?: boolean;
}
export interface JsonSimSpecs {
    startTime: number;
    endTime: number;
    dt?: string;
    saveStep?: number;
    method?: string;
    timeUnits?: string;
}
export interface JsonDimension {
    name: string;
    elements?: string[];
    size?: number;
    mapsTo?: string;
}
export interface JsonUnit {
    name: string;
    equation?: string;
    disabled?: boolean;
    aliases?: string[];
}
export interface JsonLoopMetadata {
    uids: number[];
    name: string;
    deleted?: boolean;
    description?: string;
}
export interface JsonMacroSpec {
    parameters: string[];
    primaryOutput: string;
    additionalOutputs?: string[];
}
export interface JsonModelGroup {
    name: string;
    doc?: string;
    parent?: string;
    members: string[];
    runEnabled?: boolean;
}
export interface JsonSource {
    extension?: 'xmile' | 'vensim';
    content?: string;
}
export interface JsonModel {
    name: string;
    stocks: JsonStock[];
    flows: JsonFlow[];
    auxiliaries: JsonAuxiliary[];
    modules?: JsonModule[];
    simSpecs?: JsonSimSpecs;
    views?: JsonView[];
    loopMetadata?: JsonLoopMetadata[];
    groups?: JsonModelGroup[];
    macroSpec?: JsonMacroSpec;
}
export interface JsonProject {
    name: string;
    simSpecs: JsonSimSpecs;
    models: JsonModel[];
    dimensions?: JsonDimension[];
    units?: JsonUnit[];
    source?: JsonSource;
}
export interface UpsertStockPayload {
    stock: JsonStock;
}
export interface UpsertFlowPayload {
    flow: JsonFlow;
}
export interface UpsertAuxPayload {
    aux: JsonAuxiliary;
}
export interface UpsertModulePayload {
    module: JsonModule;
}
export interface DeleteVariablePayload {
    ident: string;
}
export interface RenameVariablePayload {
    from: string;
    to: string;
}
export interface UpsertViewPayload {
    index: number;
    view: JsonView;
}
export interface DeleteViewPayload {
    index: number;
}
export interface UpdateStockFlowsPayload {
    ident: string;
    inflows: string[];
    outflows: string[];
}
export interface SetSimSpecsPayload {
    simSpecs: JsonSimSpecs;
}
export interface UpsertStockOp {
    type: 'upsertStock';
    payload: UpsertStockPayload;
}
export interface UpsertFlowOp {
    type: 'upsertFlow';
    payload: UpsertFlowPayload;
}
export interface UpsertAuxOp {
    type: 'upsertAux';
    payload: UpsertAuxPayload;
}
export interface UpsertModuleOp {
    type: 'upsertModule';
    payload: UpsertModulePayload;
}
export interface DeleteVariableOp {
    type: 'deleteVariable';
    payload: DeleteVariablePayload;
}
export interface RenameVariableOp {
    type: 'renameVariable';
    payload: RenameVariablePayload;
}
export interface UpsertViewOp {
    type: 'upsertView';
    payload: UpsertViewPayload;
}
export interface DeleteViewOp {
    type: 'deleteView';
    payload: DeleteViewPayload;
}
export interface SetSimSpecsOp {
    type: 'setSimSpecs';
    payload: SetSimSpecsPayload;
}
export interface AddModelPayload {
    name: string;
}
export interface AddModelOp {
    type: 'addModel';
    payload: AddModelPayload;
}
export interface UpdateStockFlowsOp {
    type: 'updateStockFlows';
    payload: UpdateStockFlowsPayload;
}
export type JsonModelOperation = UpsertStockOp | UpsertFlowOp | UpsertAuxOp | UpsertModuleOp | DeleteVariableOp | RenameVariableOp | UpsertViewOp | DeleteViewOp | UpdateStockFlowsOp;
export type JsonProjectOperation = SetSimSpecsOp | AddModelOp;
export interface JsonModelPatch {
    name: string;
    ops: JsonModelOperation[];
}
export interface JsonProjectPatch {
    projectOps?: JsonProjectOperation[];
    models?: JsonModelPatch[];
}
export declare function isUpsertStock(op: JsonModelOperation): op is UpsertStockOp;
export declare function isUpsertFlow(op: JsonModelOperation): op is UpsertFlowOp;
export declare function isUpsertAux(op: JsonModelOperation): op is UpsertAuxOp;
export declare function isUpsertModule(op: JsonModelOperation): op is UpsertModuleOp;
export declare function isDeleteVariable(op: JsonModelOperation): op is DeleteVariableOp;
export declare function isRenameVariable(op: JsonModelOperation): op is RenameVariableOp;
export declare function isUpsertView(op: JsonModelOperation): op is UpsertViewOp;
export declare function isDeleteView(op: JsonModelOperation): op is DeleteViewOp;
export declare function isUpdateStockFlows(op: JsonModelOperation): op is UpdateStockFlowsOp;
export declare function isSetSimSpecs(op: JsonProjectOperation): op is SetSimSpecsOp;
export declare function isAddModel(op: JsonProjectOperation): op is AddModelOp;
//# sourceMappingURL=json-types.d.ts.map