export var SimlinErrorCode;
(function (SimlinErrorCode) {
    SimlinErrorCode[SimlinErrorCode["NoError"] = 0] = "NoError";
    SimlinErrorCode[SimlinErrorCode["DoesNotExist"] = 1] = "DoesNotExist";
    SimlinErrorCode[SimlinErrorCode["XmlDeserialization"] = 2] = "XmlDeserialization";
    SimlinErrorCode[SimlinErrorCode["VensimConversion"] = 3] = "VensimConversion";
    SimlinErrorCode[SimlinErrorCode["ProtobufDecode"] = 4] = "ProtobufDecode";
    SimlinErrorCode[SimlinErrorCode["InvalidToken"] = 5] = "InvalidToken";
    SimlinErrorCode[SimlinErrorCode["UnrecognizedEof"] = 6] = "UnrecognizedEof";
    SimlinErrorCode[SimlinErrorCode["UnrecognizedToken"] = 7] = "UnrecognizedToken";
    SimlinErrorCode[SimlinErrorCode["ExtraToken"] = 8] = "ExtraToken";
    SimlinErrorCode[SimlinErrorCode["UnclosedComment"] = 9] = "UnclosedComment";
    SimlinErrorCode[SimlinErrorCode["UnclosedQuotedIdent"] = 10] = "UnclosedQuotedIdent";
    SimlinErrorCode[SimlinErrorCode["ExpectedNumber"] = 11] = "ExpectedNumber";
    SimlinErrorCode[SimlinErrorCode["UnknownBuiltin"] = 12] = "UnknownBuiltin";
    SimlinErrorCode[SimlinErrorCode["BadBuiltinArgs"] = 13] = "BadBuiltinArgs";
    SimlinErrorCode[SimlinErrorCode["EmptyEquation"] = 14] = "EmptyEquation";
    SimlinErrorCode[SimlinErrorCode["BadModuleInputDst"] = 15] = "BadModuleInputDst";
    SimlinErrorCode[SimlinErrorCode["BadModuleInputSrc"] = 16] = "BadModuleInputSrc";
    SimlinErrorCode[SimlinErrorCode["NotSimulatable"] = 17] = "NotSimulatable";
    SimlinErrorCode[SimlinErrorCode["BadTable"] = 18] = "BadTable";
    SimlinErrorCode[SimlinErrorCode["BadSimSpecs"] = 19] = "BadSimSpecs";
    SimlinErrorCode[SimlinErrorCode["NoAbsoluteReferences"] = 20] = "NoAbsoluteReferences";
    SimlinErrorCode[SimlinErrorCode["CircularDependency"] = 21] = "CircularDependency";
    SimlinErrorCode[SimlinErrorCode["ArraysNotImplemented"] = 22] = "ArraysNotImplemented";
    SimlinErrorCode[SimlinErrorCode["MultiDimensionalArraysNotImplemented"] = 23] = "MultiDimensionalArraysNotImplemented";
    SimlinErrorCode[SimlinErrorCode["BadDimensionName"] = 24] = "BadDimensionName";
    SimlinErrorCode[SimlinErrorCode["BadModelName"] = 25] = "BadModelName";
    SimlinErrorCode[SimlinErrorCode["MismatchedDimensions"] = 26] = "MismatchedDimensions";
    SimlinErrorCode[SimlinErrorCode["ArrayReferenceNeedsExplicitSubscripts"] = 27] = "ArrayReferenceNeedsExplicitSubscripts";
    SimlinErrorCode[SimlinErrorCode["DuplicateVariable"] = 28] = "DuplicateVariable";
    SimlinErrorCode[SimlinErrorCode["UnknownDependency"] = 29] = "UnknownDependency";
    SimlinErrorCode[SimlinErrorCode["VariablesHaveErrors"] = 30] = "VariablesHaveErrors";
    SimlinErrorCode[SimlinErrorCode["UnitDefinitionErrors"] = 31] = "UnitDefinitionErrors";
    SimlinErrorCode[SimlinErrorCode["Generic"] = 32] = "Generic";
    SimlinErrorCode[SimlinErrorCode["UnitMismatch"] = 33] = "UnitMismatch";
    SimlinErrorCode[SimlinErrorCode["BadOverride"] = 34] = "BadOverride";
    SimlinErrorCode[SimlinErrorCode["NoAppInUnits"] = 35] = "NoAppInUnits";
    SimlinErrorCode[SimlinErrorCode["NoSubscriptInUnits"] = 36] = "NoSubscriptInUnits";
    SimlinErrorCode[SimlinErrorCode["NoIfInUnits"] = 37] = "NoIfInUnits";
    SimlinErrorCode[SimlinErrorCode["NoUnaryOpInUnits"] = 38] = "NoUnaryOpInUnits";
    SimlinErrorCode[SimlinErrorCode["BadBinaryOpInUnits"] = 39] = "BadBinaryOpInUnits";
    SimlinErrorCode[SimlinErrorCode["NoConstInUnits"] = 40] = "NoConstInUnits";
    SimlinErrorCode[SimlinErrorCode["ExpectedInteger"] = 41] = "ExpectedInteger";
    SimlinErrorCode[SimlinErrorCode["ExpectedIntegerOne"] = 42] = "ExpectedIntegerOne";
    SimlinErrorCode[SimlinErrorCode["DuplicateUnit"] = 43] = "DuplicateUnit";
    SimlinErrorCode[SimlinErrorCode["ExpectedModule"] = 44] = "ExpectedModule";
    SimlinErrorCode[SimlinErrorCode["ExpectedIdent"] = 45] = "ExpectedIdent";
})(SimlinErrorCode || (SimlinErrorCode = {}));
export var SimlinErrorKind;
(function (SimlinErrorKind) {
    SimlinErrorKind[SimlinErrorKind["Project"] = 0] = "Project";
    SimlinErrorKind[SimlinErrorKind["Model"] = 1] = "Model";
    SimlinErrorKind[SimlinErrorKind["Variable"] = 2] = "Variable";
    SimlinErrorKind[SimlinErrorKind["Units"] = 3] = "Units";
    SimlinErrorKind[SimlinErrorKind["Simulation"] = 4] = "Simulation";
})(SimlinErrorKind || (SimlinErrorKind = {}));
export var SimlinUnitErrorKind;
(function (SimlinUnitErrorKind) {
    SimlinUnitErrorKind[SimlinUnitErrorKind["NotApplicable"] = 0] = "NotApplicable";
    SimlinUnitErrorKind[SimlinUnitErrorKind["Definition"] = 1] = "Definition";
    SimlinUnitErrorKind[SimlinUnitErrorKind["Consistency"] = 2] = "Consistency";
    SimlinUnitErrorKind[SimlinUnitErrorKind["Inference"] = 3] = "Inference";
})(SimlinUnitErrorKind || (SimlinUnitErrorKind = {}));
export var SimlinErrorSeverity;
(function (SimlinErrorSeverity) {
    SimlinErrorSeverity[SimlinErrorSeverity["Error"] = 0] = "Error";
    SimlinErrorSeverity[SimlinErrorSeverity["Warning"] = 1] = "Warning";
})(SimlinErrorSeverity || (SimlinErrorSeverity = {}));
export var SimlinJsonFormat;
(function (SimlinJsonFormat) {
    SimlinJsonFormat[SimlinJsonFormat["Native"] = 0] = "Native";
    SimlinJsonFormat[SimlinJsonFormat["Sdai"] = 1] = "Sdai";
})(SimlinJsonFormat || (SimlinJsonFormat = {}));
export var SimlinLinkPolarity;
(function (SimlinLinkPolarity) {
    SimlinLinkPolarity[SimlinLinkPolarity["Positive"] = 0] = "Positive";
    SimlinLinkPolarity[SimlinLinkPolarity["Negative"] = 1] = "Negative";
    SimlinLinkPolarity[SimlinLinkPolarity["Unknown"] = 2] = "Unknown";
})(SimlinLinkPolarity || (SimlinLinkPolarity = {}));
export var SimlinLoopPolarity;
(function (SimlinLoopPolarity) {
    SimlinLoopPolarity[SimlinLoopPolarity["Reinforcing"] = 0] = "Reinforcing";
    SimlinLoopPolarity[SimlinLoopPolarity["Balancing"] = 1] = "Balancing";
    SimlinLoopPolarity[SimlinLoopPolarity["Undetermined"] = 2] = "Undetermined";
    SimlinLoopPolarity[SimlinLoopPolarity["MostlyReinforcing"] = 3] = "MostlyReinforcing";
    SimlinLoopPolarity[SimlinLoopPolarity["MostlyBalancing"] = 4] = "MostlyBalancing";
})(SimlinLoopPolarity || (SimlinLoopPolarity = {}));
//# sourceMappingURL=types.js.map