import type { Simulator } from "@sysdml/contracts";

import type { WorkerRequest, WorkerResponse } from "./types.js";

export async function handleSimulationRequest(
	request: WorkerRequest,
	simulator: Simulator,
): Promise<WorkerResponse> {
	if (request.type !== "simulate") {
		return {
			type: "error",
			jobId: (request as { jobId?: number }).jobId ?? -1,
			message: `Unknown request type: ${(request as { type: string }).type}`,
			diagnostic: null,
		};
	}

	try {
		const result = await simulator.simulate(request.ir);
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
