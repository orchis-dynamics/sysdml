export type Ptr = number;
export type SimlinProjectPtr = number;
export type SimlinModelPtr = number;
export type SimlinSimPtr = number;
export type SimlinErrorPtr = number;
export type SimlinLoopsPtr = number;
export type SimlinLinksPtr = number;
export type SimlinErrorDetailPtr = number;
export declare enum SimlinErrorCode {
    NoError = 0,
    DoesNotExist = 1,
    XmlDeserialization = 2,
    VensimConversion = 3,
    ProtobufDecode = 4,
    InvalidToken = 5,
    UnrecognizedEof = 6,
    UnrecognizedToken = 7,
    ExtraToken = 8,
    UnclosedComment = 9,
    UnclosedQuotedIdent = 10,
    ExpectedNumber = 11,
    UnknownBuiltin = 12,
    BadBuiltinArgs = 13,
    EmptyEquation = 14,
    BadModuleInputDst = 15,
    BadModuleInputSrc = 16,
    NotSimulatable = 17,
    BadTable = 18,
    BadSimSpecs = 19,
    NoAbsoluteReferences = 20,
    CircularDependency = 21,
    ArraysNotImplemented = 22,
    MultiDimensionalArraysNotImplemented = 23,
    BadDimensionName = 24,
    BadModelName = 25,
    MismatchedDimensions = 26,
    ArrayReferenceNeedsExplicitSubscripts = 27,
    DuplicateVariable = 28,
    UnknownDependency = 29,
    VariablesHaveErrors = 30,
    UnitDefinitionErrors = 31,
    Generic = 32,
    UnitMismatch = 33,
    BadOverride = 34,
    NoAppInUnits = 35,
    NoSubscriptInUnits = 36,
    NoIfInUnits = 37,
    NoUnaryOpInUnits = 38,
    BadBinaryOpInUnits = 39,
    NoConstInUnits = 40,
    ExpectedInteger = 41,
    ExpectedIntegerOne = 42,
    DuplicateUnit = 43,
    ExpectedModule = 44,
    ExpectedIdent = 45
}
export declare enum SimlinErrorKind {
    Project = 0,
    Model = 1,
    Variable = 2,
    Units = 3,
    Simulation = 4
}
export declare enum SimlinUnitErrorKind {
    NotApplicable = 0,
    Definition = 1,
    Consistency = 2,
    Inference = 3
}
export declare enum SimlinErrorSeverity {
    Error = 0,
    Warning = 1
}
export declare enum SimlinJsonFormat {
    Native = 0,
    Sdai = 1
}
export declare enum SimlinLinkPolarity {
    Positive = 0,
    Negative = 1,
    Unknown = 2
}
export declare enum SimlinLoopPolarity {
    Reinforcing = 0,
    Balancing = 1,
    Undetermined = 2,
    MostlyReinforcing = 3,
    MostlyBalancing = 4
}
export interface ErrorDetail {
    code: SimlinErrorCode;
    message: string | null;
    modelName: string | null;
    variableName: string | null;
    startOffset: number;
    endOffset: number;
    kind: SimlinErrorKind;
    unitErrorKind: SimlinUnitErrorKind;
    severity: SimlinErrorSeverity;
    details: string | null;
}
export interface Link {
    from: string;
    to: string;
    polarity: SimlinLinkPolarity;
    score: Float64Array | null;
    relativeScore: Float64Array | null;
}
export interface Loop {
    id: string;
    variables: string[];
    polarity: SimlinLoopPolarity;
    name: string | null;
    polarityConfidence: number;
    partition: number | null;
}
//# sourceMappingURL=types.d.ts.map