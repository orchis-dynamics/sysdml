import { EulerSimulator } from "@sysdml/simulator";
import type { WorkerRequest, WorkerResponse } from "./types.js";

export function handleSimulationRequest(request: WorkerRequest): WorkerResponse {
  if (request.type !== "simulate") {
    return {
      type: "error",
      jobId: (request as { jobId?: number }).jobId ?? 0,
      message: `Unknown request type: ${(request as { type: string }).type}`,
      diagnostic: null,
    };
  }

  try {
    const result = new EulerSimulator().simulate(request.ir);
    return { type: "result", jobId: request.jobId, result };
  } catch (error) {
    return {
      type: "error",
      jobId: request.jobId,
      message: error instanceof Error ? error.message : String(error),
      diagnostic: null,
    };
  }
}
