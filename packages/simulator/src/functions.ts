import type { SimContext } from './types.js';

export function evalBuiltin(name: string, args: number[], ctx: SimContext): number {
  switch (name) {
    case 'ABS':    return Math.abs(args[0]);
    case 'INT':    return Math.floor(args[0]);
    case 'SQRT':   return Math.sqrt(args[0]);
    case 'EXP':    return Math.exp(args[0]);
    case 'LN':     return Math.log(args[0]);
    case 'LOG10':  return Math.log10(args[0]);
    case 'SIN':    return Math.sin(args[0]);
    case 'COS':    return Math.cos(args[0]);
    case 'TAN':    return Math.tan(args[0]);
    case 'ARCSIN': return Math.asin(args[0]);
    case 'ARCCOS': return Math.acos(args[0]);
    case 'ARCTAN': return Math.atan(args[0]);
    case 'MIN':    return Math.min(args[0], args[1]);
    case 'MAX':    return Math.max(args[0], args[1]);
    case 'PI':     return Math.PI;
    case 'INF':    return Infinity;
    case 'TIME':      return ctx.t;
    case 'DT':        return ctx.step;
    case 'STARTTIME': return ctx.start;
    case 'STOPTIME':  return ctx.end;
    case 'STEP':      return evalStep(args[0], args[1], ctx.t);
    case 'RAMP':      return evalRamp(args[0], args[1], ctx.t);
    case 'PULSE':     return evalPulse(args[0], args[1], args[2] ?? 0, ctx.t, ctx.step);
    case 'SIGN':      return Math.sign(args[0]);
    case 'SAFEDIV':   return args[1] === 0 ? args[2] : args[0] / args[1];
    default: throw new Error(`Built-in function '${name}' is not yet implemented`);
  }
}

function evalStep(height: number, startTime: number, t: number): number {
  return t >= startTime ? height : 0;
}

function evalRamp(slope: number, startTime: number, t: number): number {
  return t >= startTime ? slope * (t - startTime) : 0;
}

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
