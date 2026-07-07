"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopPolarity = exports.LinkPolarity = void 0;
var LinkPolarity;
(function (LinkPolarity) {
    LinkPolarity[LinkPolarity["Positive"] = 0] = "Positive";
    LinkPolarity[LinkPolarity["Negative"] = 1] = "Negative";
    LinkPolarity[LinkPolarity["Unknown"] = 2] = "Unknown";
})(LinkPolarity || (exports.LinkPolarity = LinkPolarity = {}));
var LoopPolarity;
(function (LoopPolarity) {
    LoopPolarity[LoopPolarity["Reinforcing"] = 0] = "Reinforcing";
    LoopPolarity[LoopPolarity["Balancing"] = 1] = "Balancing";
    LoopPolarity[LoopPolarity["Undetermined"] = 2] = "Undetermined";
    LoopPolarity[LoopPolarity["MostlyReinforcing"] = 3] = "MostlyReinforcing";
    LoopPolarity[LoopPolarity["MostlyBalancing"] = 4] = "MostlyBalancing";
})(LoopPolarity || (exports.LoopPolarity = LoopPolarity = {}));
//# sourceMappingURL=types.js.map