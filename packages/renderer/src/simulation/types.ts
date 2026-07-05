import type { IR, SimulationResult } from "@sysdml/contracts";

export interface SimulateRequest {
	type: "simulate";
	jobId: number;
	ir: IR;
}

export type WorkerRequest = SimulateRequest;

export interface SimulateResultResponse {
	type: "result";
	jobId: number;
	result: SimulationResult;
}

export interface SimulateErrorResponse {
	type: "error";
	jobId: number;
	message: string;
}

export type WorkerResponse = SimulateResultResponse | SimulateErrorResponse;
