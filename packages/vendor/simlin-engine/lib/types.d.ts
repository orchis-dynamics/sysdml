export interface SimSpecs {
    readonly startTime: number;
    readonly endTime: number;
    readonly dt?: string;
    readonly saveStep?: number;
    readonly method?: string;
    readonly timeUnits?: string;
}
export interface TimeSpec {
    readonly start: number;
    readonly stop: number;
    readonly dt: number;
    readonly units?: string;
}
export interface GraphicalFunctionScale {
    readonly min: number;
    readonly max: number;
}
export interface GraphicalFunction {
    readonly points?: readonly (readonly [number, number])[];
    readonly yPoints?: readonly number[];
    readonly kind?: string;
    readonly xScale?: GraphicalFunctionScale;
    readonly yScale?: GraphicalFunctionScale;
}
export interface Compat {
    readonly activeInitial?: string;
    readonly nonNegative?: boolean;
    readonly canBeModuleInput?: boolean;
    readonly isPublic?: boolean;
}
export interface ElementEquation {
    readonly subscript: string;
    readonly equation: string;
    readonly compat?: Compat;
    readonly graphicalFunction?: GraphicalFunction;
}
export interface ArrayedEquation {
    readonly dimensions: readonly string[];
    readonly equation?: string;
    readonly compat?: Compat;
    readonly elements?: readonly ElementEquation[];
}
export interface Stock {
    readonly type: 'stock';
    readonly uid?: number;
    readonly name: string;
    readonly initialEquation?: string;
    readonly units?: string;
    readonly inflows: readonly string[];
    readonly outflows: readonly string[];
    readonly documentation?: string;
    readonly arrayedEquation?: ArrayedEquation;
    readonly compat?: Compat;
}
export interface Flow {
    readonly type: 'flow';
    readonly uid?: number;
    readonly name: string;
    readonly equation?: string;
    readonly units?: string;
    readonly graphicalFunction?: GraphicalFunction;
    readonly documentation?: string;
    readonly arrayedEquation?: ArrayedEquation;
    readonly compat?: Compat;
}
export interface Aux {
    readonly type: 'aux';
    readonly uid?: number;
    readonly name: string;
    readonly equation?: string;
    readonly units?: string;
    readonly graphicalFunction?: GraphicalFunction;
    readonly documentation?: string;
    readonly arrayedEquation?: ArrayedEquation;
    readonly compat?: Compat;
}
export interface ModuleReference {
    readonly src: string;
    readonly dst: string;
}
export interface Module {
    readonly type: 'module';
    readonly uid?: number;
    readonly name: string;
    readonly modelName: string;
    readonly units?: string;
    readonly documentation?: string;
    readonly references?: readonly ModuleReference[];
    readonly compat?: Compat;
}
export type Variable = Stock | Flow | Aux | Module;
export interface FlowPoint {
    readonly x: number;
    readonly y: number;
    readonly attachedToUid?: number;
}
export interface LinkPoint {
    readonly x: number;
    readonly y: number;
}
export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
export interface StockViewElement {
    readonly type: 'stock';
    readonly uid: number;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly labelSide?: string;
}
export interface FlowViewElement {
    readonly type: 'flow';
    readonly uid: number;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly points: readonly FlowPoint[];
    readonly labelSide?: string;
}
export interface AuxViewElement {
    readonly type: 'aux';
    readonly uid: number;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly labelSide?: string;
}
export interface CloudViewElement {
    readonly type: 'cloud';
    readonly uid: number;
    readonly flowUid: number;
    readonly x: number;
    readonly y: number;
}
export interface LinkViewElement {
    readonly type: 'link';
    readonly uid: number;
    readonly fromUid: number;
    readonly toUid: number;
    readonly arc?: number;
    readonly multiPoints?: readonly LinkPoint[];
}
export interface ModuleViewElement {
    readonly type: 'module';
    readonly uid: number;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly labelSide?: string;
}
export interface AliasViewElement {
    readonly type: 'alias';
    readonly uid: number;
    readonly aliasOfUid: number;
    readonly x: number;
    readonly y: number;
    readonly labelSide?: string;
}
export type ViewElement = StockViewElement | FlowViewElement | AuxViewElement | CloudViewElement | LinkViewElement | ModuleViewElement | AliasViewElement;
export interface View {
    readonly elements: readonly ViewElement[];
    readonly kind?: string;
    readonly viewBox?: Rect;
    readonly zoom?: number;
}
export interface LoopMetadata {
    readonly uids: readonly number[];
    readonly name: string;
    readonly deleted?: boolean;
    readonly description?: string;
}
export interface Model {
    readonly name: string;
    readonly stocks: readonly Stock[];
    readonly flows: readonly Flow[];
    readonly auxiliaries: readonly Aux[];
    readonly modules?: readonly Module[];
    readonly simSpecs?: SimSpecs;
    readonly views?: readonly View[];
    readonly loopMetadata?: readonly LoopMetadata[];
}
export interface Dimension {
    readonly name: string;
    readonly elements?: readonly string[];
    readonly size?: number;
    readonly mapsTo?: string;
}
export interface Unit {
    readonly name: string;
    readonly equation?: string;
    readonly disabled?: boolean;
    readonly aliases?: readonly string[];
}
export interface Project {
    readonly name: string;
    readonly simSpecs: SimSpecs;
    readonly models: readonly Model[];
    readonly dimensions?: readonly Dimension[];
    readonly units?: readonly Unit[];
}
export interface ModelIssue {
    readonly severity: 'error' | 'warning' | 'info';
    readonly message: string;
    readonly variable?: string;
    readonly suggestion?: string;
}
export interface UnitIssue {
    readonly variable: string;
    readonly message: string;
    readonly expectedUnits?: string;
    readonly actualUnits?: string;
}
export declare enum LinkPolarity {
    Positive = 0,
    Negative = 1,
    Unknown = 2
}
export declare enum LoopPolarity {
    Reinforcing = 0,
    Balancing = 1,
    Undetermined = 2,
    MostlyReinforcing = 3,
    MostlyBalancing = 4
}
export interface Link {
    readonly from: string;
    readonly to: string;
    readonly polarity: LinkPolarity;
    readonly score?: Float64Array;
    readonly relativeScore?: Float64Array;
}
export interface Loop {
    readonly id: string;
    readonly variables: readonly string[];
    readonly polarity: LoopPolarity;
    readonly name: string | null;
    readonly polarityConfidence: number;
    readonly partition: number | null;
}
export interface DominantPeriod {
    readonly dominantLoops: readonly string[];
    readonly startTime: number;
    readonly endTime: number;
}
//# sourceMappingURL=types.d.ts.map