import type { IRAux, IRExprNode, IRFlow } from '@sysdml/ir';
import type { SimDiagnostic } from './types.js';
import { SimDiagnosticCode } from './types.js';

export interface ToposortResult {
  orderedAux: IRAux[];
  orderedFlows: IRFlow[];
  diagnostics: SimDiagnostic[];
}

export function toposort(aux: readonly IRAux[], flows: readonly IRFlow[]): ToposortResult {
  const diagnostics: SimDiagnostic[] = [];
  const auxIds = new Set(aux.map(a => a.id));

  // Collect dependencies for each aux variable
  const deps = new Map<string, Set<string>>();
  for (const a of aux) {
    const auxDeps = new Set<string>();
    collectAuxRefs(a.expr, auxIds, auxDeps);
    deps.set(a.id, auxDeps);
  }

  // Build in-degree map: map from aux id to count of dependencies it has
  const inDegree = new Map<string, number>();
  for (const a of aux) {
    const depSet = deps.get(a.id) ?? new Set();
    inDegree.set(a.id, depSet.size);
  }

  // Kahn's algorithm: start with nodes that have in-degree 0
  const queue: string[] = [];
  for (const a of aux) {
    if (inDegree.get(a.id) === 0) {
      queue.push(a.id);
    }
  }

  const orderedIds: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    orderedIds.push(id);

    // For each aux that depends on this one, decrement its in-degree
    for (const [otherId, otherDeps] of deps) {
      if (!otherDeps.has(id)) continue;
      const newDegree = (inDegree.get(otherId) ?? 0) - 1;
      inDegree.set(otherId, newDegree);
      if (newDegree === 0) {
        queue.push(otherId);
      }
    }
  }

  // Check for cycles
  if (orderedIds.length < aux.length) {
    const cycledIds = aux.filter(a => !orderedIds.includes(a.id)).map(a => a.id);
    diagnostics.push({
      code: SimDiagnosticCode.CYCLE_IN_AUX,
      message: `Cycle detected among aux variables: ${cycledIds.join(', ')}`,
    });

    // Fallback: append remaining aux in original order
    for (const a of aux) {
      if (!orderedIds.includes(a.id)) {
        orderedIds.push(a.id);
      }
    }
  }

  const auxById = new Map(aux.map(a => [a.id, a]));
  return {
    orderedAux: orderedIds.map(id => auxById.get(id)!),
    orderedFlows: [...flows],
    diagnostics,
  };
}

function collectAuxRefs(node: IRExprNode, auxIds: ReadonlySet<string>, out: Set<string>): void {
  switch (node.type) {
    case 'Num':
      break;
    case 'Ref':
      if (auxIds.has(node.id)) {
        out.add(node.id);
      }
      break;
    case 'BinOp':
      collectAuxRefs(node.left, auxIds, out);
      collectAuxRefs(node.right, auxIds, out);
      break;
    case 'UnaryMinus':
    case 'Not':
      collectAuxRefs(node.operand, auxIds, out);
      break;
    case 'IfThenElse':
      collectAuxRefs(node.cond, auxIds, out);
      collectAuxRefs(node.thenBranch, auxIds, out);
      collectAuxRefs(node.elseBranch, auxIds, out);
      break;
    case 'FunctionCall':
      for (const arg of node.args) {
        collectAuxRefs(arg, auxIds, out);
      }
      break;
    case 'GFCall':
      collectAuxRefs(node.argument, auxIds, out);
      break;
  }
}
