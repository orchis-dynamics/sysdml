import type { Simulator } from "@sysdml/contracts";

import type { SimulateRequest, WorkerResponse } from "./types.js";

function isSimulateRequest(value: unknown): value is SimulateRequest {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		value.type === "simulate" &&
		"jobId" in value &&
		typeof value.jobId === "number" &&
		"ir" in value &&
		typeof value.ir === "object" &&
		value.ir !== null
	);
}

function readJobId(value: unknown): number {
	if (
		typeof value === "object" &&
		value !== null &&
		"jobId" in value &&
		typeof value.jobId === "number"
	) {
		return value.jobId;
	}
	return -1;
}

function readRequestType(value: unknown): string {
	if (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof value.type === "string"
	) {
		return value.type;
	}
	return String(value);
}

export async function handleSimulationRequest(
	request: unknown,
	simulator: Simulator,
): Promise<WorkerResponse> {
	if (!isSimulateRequest(request)) {
		return {
			type: "error",
			jobId: readJobId(request),
			message: `Unknown request type: ${readRequestType(request)}`,
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
		};
	}
}
