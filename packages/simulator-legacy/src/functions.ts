import { SimDiagnosticCode } from "./types.js";
import type { SimContext } from "./types.js";
import { SimulationHaltedError } from "./types.js";

// oxlint-disable-next-line complexity max-lines-per-function
export function evalBuiltin(
	name: string,
	args: number[],
	ctx: SimContext,
): number {
	switch (name) {
		case "ABS":
			return Math.abs(args[0]);
		case "INT":
			return Math.floor(args[0]);
		case "SQRT":
			return requirePositive("SQRT", args[0], true, Math.sqrt);
		case "EXP":
			return Math.exp(args[0]);
		case "LN":
			return requirePositive("LN", args[0], false, Math.log);
		case "LOG10":
			return requirePositive("LOG10", args[0], false, Math.log10);
		case "SIN":
			return Math.sin(args[0]);
		case "COS":
			return Math.cos(args[0]);
		case "TAN":
			return Math.tan(args[0]);
		case "ARCSIN":
			return Math.asin(args[0]);
		case "ARCCOS":
			return Math.acos(args[0]);
		case "ARCTAN":
			return Math.atan(args[0]);
		case "MIN":
			return Math.min(args[0], args[1]);
		case "MAX":
			return Math.max(args[0], args[1]);
		case "PI":
			return Math.PI;
		case "INF":
			return Infinity;
		case "TIME":
			return ctx.t;
		case "DT":
			return ctx.step;
		case "STARTTIME":
			return ctx.start;
		case "STOPTIME":
			return ctx.end;
		case "STEP":
			return evalStep(args[0], args[1], ctx.t);
		case "RAMP":
			return evalRamp(args[0], args[1], ctx.t);
		case "PULSE":
			return evalPulse(args[0], args[1], args[2] ?? 0, ctx.t, ctx.step);
		case "SIGN":
			return Math.sign(args[0]);
		case "SAFEDIV":
			return args[1] === 0 ? args[2] : args[0] / args[1];
		default:
			throw new Error(`Built-in function '${name}' is not yet implemented`);
	}
}

function requirePositive(
	name: string,
	x: number,
	allowZero: boolean,
	fn: (n: number) => number,
): number {
	const violates = allowZero ? x < 0 : x <= 0;
	if (violates) {
		const bound = allowZero ? ">= 0" : "> 0";
		throw new SimulationHaltedError({
			code: SimDiagnosticCode.MATH_DOMAIN_ERROR,
			message: `${name}(${x}) is out of domain — argument must be ${bound}`,
		});
	}
	return fn(x);
}

function evalStep(height: number, startTime: number, t: number): number {
	return t >= startTime ? height : 0;
}

function evalRamp(slope: number, startTime: number, t: number): number {
	return t >= startTime ? slope * (t - startTime) : 0;
}

// oxlint-disable-next-line max-params
function evalPulse(
	magnitude: number,
	firstTime: number,
	interval: number,
	t: number,
	step: number,
): number {
	if (t < firstTime) return 0;
	if (interval <= 0) {
		return t - firstTime < step ? magnitude / step : 0;
	}
	if (interval < step) {
		return magnitude / step;
	}
	const elapsed = t - firstTime;
	return elapsed % interval < step ? magnitude / step : 0;
}
