/// <reference types="vite/client" />

import type { IR, SimulationResult } from "@sysdml/contracts";

import type { WorkerRequest, WorkerResponse } from "./types.js";
// The worker import form is selected at build time by the `workerInline` Vite
// plugin (see vite.config.ts):
//   --mode vscode → "?worker&inline"  (blob: URL — same-origin with the
//                                       vscode-webview://[guid] iframe origin;
//                                       required because VS Code serves
//                                       resources from a different origin and
//                                       Worker constructors enforce same-origin)
//   default (web) → "?worker"          (separate same-origin hashed asset, the
//                                       cleaner pattern for single-origin
//                                       deployments like the hosted Monaco demo)
import SimulatorWorker from "./worker.ts?worker";

export type WorkerFactory = () => Worker;

export class SimulatorClient {
	private readonly worker: Worker;
	private nextJobId = 1;
	private latestJobId = 0;
	private disposed = false;
	private resultListeners = new Set<(result: SimulationResult) => void>();
	private errorListeners = new Set<(message: string) => void>();

	constructor(workerFactory: WorkerFactory) {
		this.worker = workerFactory();
		this.worker.addEventListener(
			"message",
			(event: MessageEvent<WorkerResponse>) => {
				if (this.disposed) return;
				const response = event.data;
				if (response.jobId !== this.latestJobId) return;
				if (response.type === "result") {
					for (const cb of this.resultListeners) cb(response.result);
				} else {
					for (const cb of this.errorListeners) cb(response.message);
				}
			},
		);
		this.worker.addEventListener("error", (event: ErrorEvent) => {
			if (this.disposed) return;
			this.reportError(this.describeWorkerError(event));
		});
		this.worker.addEventListener("messageerror", () => {
			if (this.disposed) return;
			this.reportError(
				"Simulation worker sent a message that could not be deserialized",
			);
		});
	}

	private describeWorkerError(event: ErrorEvent): string {
		const detail = event.message || "unknown error";
		const location =
			event.filename && event.lineno
				? ` (${event.filename}:${event.lineno})`
				: "";
		return `Simulation worker failed: ${detail}${location}`;
	}

	private reportError(message: string): void {
		for (const cb of this.errorListeners) cb(message);
	}

	simulate(ir: IR): void {
		this.latestJobId = this.nextJobId++;
		const request: WorkerRequest = {
			type: "simulate",
			jobId: this.latestJobId,
			ir,
		};
		this.worker.postMessage(request);
	}

	onResult(cb: (result: SimulationResult) => void): void {
		this.resultListeners.add(cb);
	}

	onError(cb: (message: string) => void): void {
		this.errorListeners.add(cb);
	}

	dispose(): void {
		this.disposed = true;
		this.worker.terminate();
	}
}

export function createDefaultSimulatorClient(): SimulatorClient {
	return new SimulatorClient(() => new SimulatorWorker());
}
