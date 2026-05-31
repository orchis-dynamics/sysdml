import type { IR } from "@sysdml/ir";
import type { SimulationResult, SimDiagnostic } from "@sysdml/simulator";

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
	diagnostic: SimDiagnostic | null;
}

export type WorkerResponse = SimulateResultResponse | SimulateErrorResponse;
