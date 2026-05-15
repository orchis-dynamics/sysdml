import type { IR, IRAuxiliary, IRExpressionNode, IRFlow, IRStock } from '@sysdml/ir';
import type { SimDiagnostic } from './types.js';
import { SimDiagnosticCode } from './types.js';

interface DesugarState {
  hiddenStocks: IRStock[];
  hiddenFlows: IRFlow[];
  diagnostics: SimDiagnostic[];
  counter: number;
}

export function desugarIR(ir: IR): { ir: IR; diagnostics: SimDiagnostic[] } {
  const state: DesugarState = {
    hiddenStocks: [],
    hiddenFlows: [],
    diagnostics: [],
    counter: 0,
  };

  const transformedAux: IRAuxiliary[] = ir.auxiliaries.map(a => ({
    ...a,
    expr: transformExpr(a.expr, state),
  }));

  const transformedFlows: IRFlow[] = ir.flows.map(f => ({
    ...f,
    rate: transformExpr(f.rate, state),
  }));

  const desugaredIR: IR = {
    ...ir,
    auxiliaries: transformedAux,
    flows: [...transformedFlows, ...state.hiddenFlows],
    stocks: [...ir.stocks, ...state.hiddenStocks],
  };

  return { ir: desugaredIR, diagnostics: state.diagnostics };
}

function transformExpr(node: IRExpressionNode, state: DesugarState): IRExpressionNode {
  switch (node.type) {
    case 'Number':
    case 'Reference':
      return node;
    case 'UnaryMinus':
      return { ...node, operand: transformExpr(node.operand, state) };
    case 'Not':
      return { ...node, operand: transformExpr(node.operand, state) };
    case 'BinaryOperation':
      return {
        ...node,
        left: transformExpr(node.left, state),
        right: transformExpr(node.right, state),
      };
    case 'IfThenElse':
      return {
        ...node,
        cond: transformExpr(node.cond, state),
        thenBranch: transformExpr(node.thenBranch, state),
        elseBranch: transformExpr(node.elseBranch, state),
      };
    case 'GraphicalFunctionCall':
      return { ...node, argument: transformExpr(node.argument, state) };
    case 'FunctionCall':
      return transformFunctionCall(node.name, node.args, state);
    default: {
      const unreachable: never = node;
      void unreachable;
      throw new Error('transformExpr: unhandled IRExpressionNode type');
    }
  }
}

function transformFunctionCall(
  name: string,
  args: readonly IRExpressionNode[],
  state: DesugarState,
): IRExpressionNode {
  switch (name) {
    case 'DELAY1': return desugarDelay1(args, state);
    case 'DELAY3': return desugarDelay3(args, state);
    case 'DELAYN': return desugarDelayN(args, state);
    case 'SMTH1':  return desugarSmth1(args, state);
    case 'SMTH3':  return desugarSmth3(args, state);
    case 'SMTHN':  return desugarSmthN(args, state);
    case 'TREND':  return desugarTrend(args, state);
    case 'FORCST': return desugarForcst(args, state);
    default:
      return {
        type: 'FunctionCall',
        name,
        args: args.map(a => transformExpr(a, state)),
      };
  }
}

function nextId(state: DesugarState, prefix: string): string {
  return `_${prefix}_${state.counter++}`;
}

function makeStockOutputExpr(stockId: string, delayTimeExpr: IRExpressionNode): IRExpressionNode {
  return {
    type: 'BinaryOperation',
    op: '/',
    left: { type: 'Reference', id: stockId },
    right: delayTimeExpr,
  };
}

function desugarDelay1(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, delayTimeExpr, initExpr] = args;
  const stockId = nextId(state, 'delay1');
  const flowId = nextId(state, 'delay1_flow');

  const initValueExpr = initExpr ?? inputExpr;
  const stockInit: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '*',
    left: initValueExpr,
    right: delayTimeExpr,
  };

  const outputExpr = makeStockOutputExpr(stockId, delayTimeExpr);

  const flowRate: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '/',
    left: { type: 'BinaryOperation', op: '-', left: inputExpr, right: outputExpr },
    right: delayTimeExpr,
  };

  state.hiddenStocks.push({ id: stockId, init: stockInit });
  state.hiddenFlows.push({ id: flowId, from: null, to: stockId, rate: flowRate });

  return makeStockOutputExpr(stockId, delayTimeExpr);
}

function buildStageArgs(
  inputExpr: IRExpressionNode,
  stageTimeExpr: IRExpressionNode,
  initExpr: IRExpressionNode | undefined,
): IRExpressionNode[] {
  return initExpr !== undefined
    ? [inputExpr, stageTimeExpr, initExpr]
    : [inputExpr, stageTimeExpr];
}

function desugarDelay3(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, delayTimeExpr, initExpr] = args;
  const stageDelay: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '/',
    left: delayTimeExpr,
    right: { type: 'Number', value: 3 },
  };

  const stage1 = desugarDelay1(buildStageArgs(inputExpr, stageDelay, initExpr), state);
  const stage2 = desugarDelay1(buildStageArgs(stage1, stageDelay, initExpr), state);
  return          desugarDelay1(buildStageArgs(stage2, stageDelay, initExpr), state);
}

function desugarDelayN(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, delayTimeExpr, nExpr, initExpr] = args;

  if (nExpr.type !== 'Number') {
    state.diagnostics.push({
      code: SimDiagnosticCode.INVALID_DELAY_ORDER,
      message: 'DELAYN order must be a numeric literal',
    });
    return { type: 'Number', value: 0 };
  }

  const n = Math.floor(nExpr.value);
  if (n < 1) {
    state.diagnostics.push({
      code: SimDiagnosticCode.INVALID_DELAY_ORDER,
      message: `DELAYN order must be >= 1, got ${n}`,
    });
    return { type: 'Number', value: 0 };
  }

  const stageDelay: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '/',
    left: delayTimeExpr,
    right: { type: 'Number', value: n },
  };

  let current: IRExpressionNode = inputExpr;
  for (let i = 0; i < n; i++) {
    current = desugarDelay1(buildStageArgs(current, stageDelay, initExpr), state);
  }
  return current;
}

function desugarSmth1(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, avgTimeExpr, initExpr] = args;
  const stockId = nextId(state, 'smth1');
  const flowId = nextId(state, 'smth1_flow');

  const stockInit: IRExpressionNode = initExpr ?? inputExpr;

  const flowRate: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '/',
    left: { type: 'BinaryOperation', op: '-', left: inputExpr, right: { type: 'Reference', id: stockId } },
    right: avgTimeExpr,
  };

  state.hiddenStocks.push({ id: stockId, init: stockInit });
  state.hiddenFlows.push({ id: flowId, from: null, to: stockId, rate: flowRate });

  return { type: 'Reference', id: stockId };
}

function desugarSmth3(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, avgTimeExpr, initExpr] = args;
  const stageTime: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '/',
    left: avgTimeExpr,
    right: { type: 'Number', value: 3 },
  };

  const stage1 = desugarSmth1(buildStageArgs(inputExpr, stageTime, initExpr), state);
  const stage2 = desugarSmth1(buildStageArgs(stage1, stageTime, initExpr), state);
  return          desugarSmth1(buildStageArgs(stage2, stageTime, initExpr), state);
}

function desugarSmthN(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, avgTimeExpr, nExpr, initExpr] = args;

  if (nExpr.type !== 'Number') {
    state.diagnostics.push({
      code: SimDiagnosticCode.INVALID_DELAY_ORDER,
      message: 'SMTHN order must be a numeric literal',
    });
    return { type: 'Number', value: 0 };
  }

  const n = Math.floor(nExpr.value);
  if (n < 1) {
    state.diagnostics.push({
      code: SimDiagnosticCode.INVALID_DELAY_ORDER,
      message: `SMTHN order must be >= 1, got ${n}`,
    });
    return { type: 'Number', value: 0 };
  }

  const stageTime: IRExpressionNode = {
    type: 'BinaryOperation',
    op: '/',
    left: avgTimeExpr,
    right: { type: 'Number', value: n },
  };

  let current: IRExpressionNode = inputExpr;
  for (let i = 0; i < n; i++) {
    current = desugarSmth1(buildStageArgs(current, stageTime, initExpr), state);
  }
  return current;
}

function desugarTrend(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, avgTimeExpr, initExpr] = args;
  const smthArgs = buildStageArgs(inputExpr, avgTimeExpr, initExpr);
  const smoothRef = desugarSmth1(smthArgs, state);

  return {
    type: 'BinaryOperation',
    op: '/',
    left: { type: 'BinaryOperation', op: '-', left: inputExpr, right: smoothRef },
    right: { type: 'BinaryOperation', op: '*', left: avgTimeExpr, right: smoothRef },
  };
}

function desugarForcst(args: readonly IRExpressionNode[], state: DesugarState): IRExpressionNode {
  const [inputExpr, avgTimeExpr, horizonExpr, initTrendExpr] = args;
  const trendArgs = buildStageArgs(inputExpr, avgTimeExpr, initTrendExpr);
  const trendExpr = desugarTrend(trendArgs, state);

  return {
    type: 'BinaryOperation',
    op: '*',
    left: inputExpr,
    right: {
      type: 'BinaryOperation',
      op: '+',
      left: { type: 'Number', value: 1 },
      right: { type: 'BinaryOperation', op: '*', left: trendExpr, right: horizonExpr },
    },
  };
}
