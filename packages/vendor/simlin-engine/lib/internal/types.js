"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimlinLoopPolarity = exports.SimlinLinkPolarity = exports.SimlinJsonFormat = exports.SimlinUnitErrorKind = exports.SimlinErrorKind = exports.SimlinErrorCode = void 0;
var SimlinErrorCode;
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
})(SimlinErrorCode || (exports.SimlinErrorCode = SimlinErrorCode = {}));
var SimlinErrorKind;
(function (SimlinErrorKind) {
    SimlinErrorKind[SimlinErrorKind["Project"] = 0] = "Project";
    SimlinErrorKind[SimlinErrorKind["Model"] = 1] = "Model";
    SimlinErrorKind[SimlinErrorKind["Variable"] = 2] = "Variable";
    SimlinErrorKind[SimlinErrorKind["Units"] = 3] = "Units";
    SimlinErrorKind[SimlinErrorKind["Simulation"] = 4] = "Simulation";
})(SimlinErrorKind || (exports.SimlinErrorKind = SimlinErrorKind = {}));
var SimlinUnitErrorKind;
(function (SimlinUnitErrorKind) {
    SimlinUnitErrorKind[SimlinUnitErrorKind["NotApplicable"] = 0] = "NotApplicable";
    SimlinUnitErrorKind[SimlinUnitErrorKind["Definition"] = 1] = "Definition";
    SimlinUnitErrorKind[SimlinUnitErrorKind["Consistency"] = 2] = "Consistency";
    SimlinUnitErrorKind[SimlinUnitErrorKind["Inference"] = 3] = "Inference";
})(SimlinUnitErrorKind || (exports.SimlinUnitErrorKind = SimlinUnitErrorKind = {}));
var SimlinJsonFormat;
(function (SimlinJsonFormat) {
    SimlinJsonFormat[SimlinJsonFormat["Native"] = 0] = "Native";
    SimlinJsonFormat[SimlinJsonFormat["Sdai"] = 1] = "Sdai";
})(SimlinJsonFormat || (exports.SimlinJsonFormat = SimlinJsonFormat = {}));
var SimlinLinkPolarity;
(function (SimlinLinkPolarity) {
    SimlinLinkPolarity[SimlinLinkPolarity["Positive"] = 0] = "Positive";
    SimlinLinkPolarity[SimlinLinkPolarity["Negative"] = 1] = "Negative";
    SimlinLinkPolarity[SimlinLinkPolarity["Unknown"] = 2] = "Unknown";
})(SimlinLinkPolarity || (exports.SimlinLinkPolarity = SimlinLinkPolarity = {}));
var SimlinLoopPolarity;
(function (SimlinLoopPolarity) {
    SimlinLoopPolarity[SimlinLoopPolarity["Reinforcing"] = 0] = "Reinforcing";
    SimlinLoopPolarity[SimlinLoopPolarity["Balancing"] = 1] = "Balancing";
    SimlinLoopPolarity[SimlinLoopPolarity["Undetermined"] = 2] = "Undetermined";
})(SimlinLoopPolarity || (exports.SimlinLoopPolarity = SimlinLoopPolarity = {}));
//# sourceMappingURL=types.js.map