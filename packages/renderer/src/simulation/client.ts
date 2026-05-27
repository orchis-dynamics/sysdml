import type { IR } from "@sysdml/ir";
import type { SimulationResult } from "@sysdml/simulator";
import type { WorkerRequest, WorkerResponse } from "./types.js";

export type WorkerFactory = () => Worker;

export class SimulatorClient {
  private readonly worker: Worker;
  private nextJobId = 1;
  private latestJobId = 0;
  private resultListeners = new Set<(result: SimulationResult) => void>();
  private errorListeners = new Set<(message: string) => void>();

  constructor(workerFactory: WorkerFactory) {
    this.worker = workerFactory();
    this.worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.jobId !== this.latestJobId) return;
      if (response.type === "result") {
        for (const cb of this.resultListeners) cb(response.result);
      } else {
        for (const cb of this.errorListeners) cb(response.message);
      }
    });
  }

  simulate(ir: IR): void {
    this.latestJobId = this.nextJobId++;
    const request: WorkerRequest = { type: "simulate", jobId: this.latestJobId, ir };
    this.worker.postMessage(request);
  }

  onResult(cb: (result: SimulationResult) => void): void {
    this.resultListeners.add(cb);
  }

  onError(cb: (message: string) => void): void {
    this.errorListeners.add(cb);
  }

  dispose(): void {
    this.worker.terminate();
  }
}
