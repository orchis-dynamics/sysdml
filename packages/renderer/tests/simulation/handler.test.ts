import { describe, expect, test } from "vitest";
import { parseSource } from "@sysdml/parser";
import { compileAST } from "@sysdml/ir";

import { handleSimulationRequest } from "../../src/simulation/handler.js";
import type { SimulateRequest } from "../../src/simulation/types.js";
import { SimDiagnosticCode } from "@sysdml/simulator";

function buildIR(source: string) {
  const { ast } = parseSource(source);
  if (!ast) throw new Error("parse failed in fixture");
  const { ir } = compileAST(ast);
  if (!ir) throw new Error("compile failed in fixture");
  return ir;
}

const MINIMAL_MODEL = `
model Test
time { start: 0 end: 5 step: 1 }
stock population { init: 100 }
aux growth_rate = 0.1
flow births { from: null to: population rate: population * growth_rate }
`.trim();

describe("handleSimulationRequest", () => {
  test("returns result with rows for a valid IR", () => {
    const request: SimulateRequest = { type: "simulate", jobId: 7, ir: buildIR(MINIMAL_MODEL) };
    const response = handleSimulationRequest(request);
    expect(response.type).toBe("result");
    if (response.type !== "result") throw new Error("unreachable");
    expect(response.jobId).toBe(7);
    expect(response.result.rows.length).toBeGreaterThan(0);
    expect(response.result.rows[0]?.time).toBe(0);
    expect(response.result.diagnostics).toEqual([]);
  });

  test("preserves jobId in the response", () => {
    const request: SimulateRequest = { type: "simulate", jobId: 42, ir: buildIR(MINIMAL_MODEL) };
    const response = handleSimulationRequest(request);
    expect(response.jobId).toBe(42);
  });

  test("halted simulation returns result with diagnostics (not error)", () => {
    // LN(0) triggers MATH_DOMAIN_ERROR inside the simulator. The simulator
    // catches SimulationHaltedError internally and folds it into diagnostics,
    // so the handler must return type:"result" — not type:"error".
    // (The originally-specified `init = nonexistent_identifier` does not halt —
    // the evaluator silently returns 0 for unknown identifiers.)
    const haltingModel = `
model Halt
time { start: 0 end: 5 step: 1 }
stock level { init: 1 }
aux bad_value = LN(0)
`.trim();
    const request: SimulateRequest = { type: "simulate", jobId: 1, ir: buildIR(haltingModel) };
    const response = handleSimulationRequest(request);
    expect(response.type).toBe("result");
    if (response.type !== "result") throw new Error("unreachable");
    expect(response.jobId).toBe(1);
    expect(response.result.diagnostics.length).toBeGreaterThan(0);
    // diagnostic code should be one of the halt codes; check it's not a benign warning
    const haltCodes: string[] = [
      SimDiagnosticCode.CYCLE_IN_AUX,
      SimDiagnosticCode.INIT_REQUIRES_IDENT,
      SimDiagnosticCode.INVALID_DELAY_ORDER,
      SimDiagnosticCode.MATH_DOMAIN_ERROR,
    ];
    expect(haltCodes).toContain(response.result.diagnostics[0]!.code);
  });

  test("returns error response when simulator throws an unexpected JS error", () => {
    // Bypass the type system to inject a malformed IR that crashes the simulator
    // with a plain Error (not a SimulationHaltedError, which would be folded into
    // diagnostics). We pass null as the whole IR which should cause the simulator
    // to throw when it tries to access fields.
    const request: SimulateRequest = {
      type: "simulate",
      jobId: 99,
      ir: null as unknown as ReturnType<typeof buildIR>,
    };
    const response = handleSimulationRequest(request);
    expect(response.type).toBe("error");
    if (response.type !== "error") throw new Error("unreachable");
    expect(response.jobId).toBe(99);
    expect(response.message.length).toBeGreaterThan(0);
    expect(response.diagnostic).toBeNull();
  });
});
