export var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["NoError"] = 0] = "NoError";
    ErrorCode[ErrorCode["DoesNotExist"] = 1] = "DoesNotExist";
    ErrorCode[ErrorCode["XmlDeserialization"] = 2] = "XmlDeserialization";
    ErrorCode[ErrorCode["VensimConversion"] = 3] = "VensimConversion";
    ErrorCode[ErrorCode["ProtobufDecode"] = 4] = "ProtobufDecode";
    ErrorCode[ErrorCode["InvalidToken"] = 5] = "InvalidToken";
    ErrorCode[ErrorCode["UnrecognizedEof"] = 6] = "UnrecognizedEof";
    ErrorCode[ErrorCode["UnrecognizedToken"] = 7] = "UnrecognizedToken";
    ErrorCode[ErrorCode["ExtraToken"] = 8] = "ExtraToken";
    ErrorCode[ErrorCode["UnclosedComment"] = 9] = "UnclosedComment";
    ErrorCode[ErrorCode["UnclosedQuotedIdent"] = 10] = "UnclosedQuotedIdent";
    ErrorCode[ErrorCode["ExpectedNumber"] = 11] = "ExpectedNumber";
    ErrorCode[ErrorCode["UnknownBuiltin"] = 12] = "UnknownBuiltin";
    ErrorCode[ErrorCode["BadBuiltinArgs"] = 13] = "BadBuiltinArgs";
    ErrorCode[ErrorCode["EmptyEquation"] = 14] = "EmptyEquation";
    ErrorCode[ErrorCode["BadModuleInputDst"] = 15] = "BadModuleInputDst";
    ErrorCode[ErrorCode["BadModuleInputSrc"] = 16] = "BadModuleInputSrc";
    ErrorCode[ErrorCode["NotSimulatable"] = 17] = "NotSimulatable";
    ErrorCode[ErrorCode["BadTable"] = 18] = "BadTable";
    ErrorCode[ErrorCode["BadSimSpecs"] = 19] = "BadSimSpecs";
    ErrorCode[ErrorCode["NoAbsoluteReferences"] = 20] = "NoAbsoluteReferences";
    ErrorCode[ErrorCode["CircularDependency"] = 21] = "CircularDependency";
    ErrorCode[ErrorCode["ArraysNotImplemented"] = 22] = "ArraysNotImplemented";
    ErrorCode[ErrorCode["MultiDimensionalArraysNotImplemented"] = 23] = "MultiDimensionalArraysNotImplemented";
    ErrorCode[ErrorCode["BadDimensionName"] = 24] = "BadDimensionName";
    ErrorCode[ErrorCode["BadModelName"] = 25] = "BadModelName";
    ErrorCode[ErrorCode["MismatchedDimensions"] = 26] = "MismatchedDimensions";
    ErrorCode[ErrorCode["ArrayReferenceNeedsExplicitSubscripts"] = 27] = "ArrayReferenceNeedsExplicitSubscripts";
    ErrorCode[ErrorCode["DuplicateVariable"] = 28] = "DuplicateVariable";
    ErrorCode[ErrorCode["UnknownDependency"] = 29] = "UnknownDependency";
    ErrorCode[ErrorCode["VariablesHaveErrors"] = 30] = "VariablesHaveErrors";
    ErrorCode[ErrorCode["UnitDefinitionErrors"] = 31] = "UnitDefinitionErrors";
    ErrorCode[ErrorCode["Generic"] = 32] = "Generic";
    ErrorCode[ErrorCode["NoAppInUnits"] = 33] = "NoAppInUnits";
    ErrorCode[ErrorCode["NoSubscriptInUnits"] = 34] = "NoSubscriptInUnits";
    ErrorCode[ErrorCode["NoIfInUnits"] = 35] = "NoIfInUnits";
    ErrorCode[ErrorCode["NoUnaryOpInUnits"] = 36] = "NoUnaryOpInUnits";
    ErrorCode[ErrorCode["BadBinaryOpInUnits"] = 37] = "BadBinaryOpInUnits";
    ErrorCode[ErrorCode["NoConstInUnits"] = 38] = "NoConstInUnits";
    ErrorCode[ErrorCode["ExpectedInteger"] = 39] = "ExpectedInteger";
    ErrorCode[ErrorCode["ExpectedIntegerOne"] = 40] = "ExpectedIntegerOne";
    ErrorCode[ErrorCode["DuplicateUnit"] = 41] = "DuplicateUnit";
    ErrorCode[ErrorCode["ExpectedModule"] = 42] = "ExpectedModule";
    ErrorCode[ErrorCode["ExpectedIdent"] = 43] = "ExpectedIdent";
    ErrorCode[ErrorCode["UnitMismatch"] = 44] = "UnitMismatch";
    ErrorCode[ErrorCode["TodoWildcard"] = 45] = "TodoWildcard";
    ErrorCode[ErrorCode["TodoStarRange"] = 46] = "TodoStarRange";
    ErrorCode[ErrorCode["TodoRange"] = 47] = "TodoRange";
    ErrorCode[ErrorCode["TodoArrayBuiltin"] = 48] = "TodoArrayBuiltin";
    ErrorCode[ErrorCode["CantSubscriptScalar"] = 49] = "CantSubscriptScalar";
    ErrorCode[ErrorCode["DimensionInScalarContext"] = 50] = "DimensionInScalarContext";
})(ErrorCode || (ErrorCode = {}));
export function errorCodeDescription(code) {
    switch (code) {
        case ErrorCode.NoError:
            return 'Internal error';
        case ErrorCode.DoesNotExist:
            return 'Does not exist';
        case ErrorCode.XmlDeserialization:
            return 'XML deserialization error';
        case ErrorCode.VensimConversion:
            return 'Vensim conversion error';
        case ErrorCode.ProtobufDecode:
            return 'Internal error (protocol buffer decoding)';
        case ErrorCode.InvalidToken:
            return 'Invalid input in equation';
        case ErrorCode.UnrecognizedEof:
            return 'Unexpectedly reached the end of the equation';
        case ErrorCode.UnrecognizedToken:
            return 'Unrecognized input in equation';
        case ErrorCode.ExtraToken:
            return 'Extra input after equation fully parsed';
        case ErrorCode.UnclosedComment:
            return 'Unclosed comment';
        case ErrorCode.UnclosedQuotedIdent:
            return 'Unclosed quoted identifier';
        case ErrorCode.ExpectedNumber:
            return 'Expected a literal number';
        case ErrorCode.UnknownBuiltin:
            return 'Reference to unknown or unimplemented builtin';
        case ErrorCode.BadBuiltinArgs:
            return 'Incorrect arguments to a builtin function (e.g. too many, too few)';
        case ErrorCode.EmptyEquation:
            return 'Variable has empty equation';
        case ErrorCode.BadModuleInputDst:
            return 'Module input destination is unknown';
        case ErrorCode.BadModuleInputSrc:
            return 'Module input source is unknown';
        case ErrorCode.NotSimulatable:
            return 'Model has errors and is not simulatable';
        case ErrorCode.BadTable:
            return 'No graphical function for specified variable';
        case ErrorCode.BadSimSpecs:
            return 'Simulation Specs are not valid';
        case ErrorCode.NoAbsoluteReferences:
            return 'Absolute references are not supported';
        case ErrorCode.CircularDependency:
            return 'Circular dependency';
        case ErrorCode.ArraysNotImplemented:
            return 'Arrays not implemented';
        case ErrorCode.MultiDimensionalArraysNotImplemented:
            return 'Multi-dimensional arrays not implemented';
        case ErrorCode.BadDimensionName:
            return 'Unknown dimension name';
        case ErrorCode.BadModelName:
            return 'Unknown model name';
        case ErrorCode.MismatchedDimensions:
            return 'Mismatched dimensions';
        case ErrorCode.ArrayReferenceNeedsExplicitSubscripts:
            return 'Array reference needs explicit subscripts';
        case ErrorCode.DuplicateVariable:
            return 'Duplicate variable';
        case ErrorCode.UnknownDependency:
            return 'Equation refers to unknown variable';
        case ErrorCode.VariablesHaveErrors:
            return 'Variables have equation errors';
        case ErrorCode.UnitDefinitionErrors:
            return "The project's unit definitions have errors";
        case ErrorCode.Generic:
            return 'Generic error from core engine';
        case ErrorCode.NoAppInUnits:
            return 'Function calls are not allowed in unit definition';
        case ErrorCode.NoSubscriptInUnits:
            return 'Subscripts are not allowed in unit definition';
        case ErrorCode.NoIfInUnits:
            return 'If statements are not allowed in unit definition';
        case ErrorCode.NoUnaryOpInUnits:
            return "Negative units like `-people` don't make sense. Try e.g. `1/people`";
        case ErrorCode.BadBinaryOpInUnits:
            return 'Only * and / operations are supported in unit definitions';
        case ErrorCode.NoConstInUnits:
            return 'Constants are not supported in unit definitions';
        case ErrorCode.ExpectedInteger:
            return 'Expected an integer';
        case ErrorCode.ExpectedIntegerOne:
            return 'Expected the integer `1`';
        case ErrorCode.DuplicateUnit:
            return 'Duplicate unit definition';
        case ErrorCode.ExpectedModule:
            return 'Expected a module, found a non-module';
        case ErrorCode.ExpectedIdent:
            return 'Expected an identifier';
        case ErrorCode.UnitMismatch:
            return 'Unit mismatch';
        case ErrorCode.TodoWildcard:
            return 'Wildcard subscripts not yet implemented';
        case ErrorCode.TodoStarRange:
            return 'Star range subscripts not yet implemented';
        case ErrorCode.TodoRange:
            return 'Range subscripts not yet implemented';
        case ErrorCode.TodoArrayBuiltin:
            return 'Array builtin not yet implemented';
        case ErrorCode.CantSubscriptScalar:
            return 'Cannot subscript a scalar variable';
        case ErrorCode.DimensionInScalarContext:
            return 'Dimension used in scalar context';
    }
    return 'Unknown error from core engine';
}
//# sourceMappingURL=errors.js.map