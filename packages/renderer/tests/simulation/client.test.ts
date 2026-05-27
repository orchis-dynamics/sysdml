import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import type { IR } from "@sysdml/ir";
import type { SimulationResult } from "@sysdml/simulator";

import { SimulatorClient } from "../../src/simulation/client.js";
import type { WorkerRequest, WorkerResponse } from "../../src/simulation/types.js";

class FakeWorker {
  static instances: FakeWorker[] = [];
  postedMessages: WorkerRequest[] = [];
  terminated = false;
  private listeners: Array<(event: MessageEvent<WorkerResponse>) => void> = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: WorkerRequest): void {
    this.postedMessages.push(message);
  }

  addEventListener(event: "message", cb: (event: MessageEvent<WorkerResponse>) => void): void {
    if (event === "message") this.listeners.push(cb);
  }

  terminate(): void {
    this.terminated = true;
  }

  fire(response: WorkerResponse): void {
    const event = { data: response } as MessageEvent<WorkerResponse>;
    for (const cb of this.listeners) cb(event);
  }
}

const stubIR = { stocks: [], flows: [], auxiliaries: [], graphicalFunctions: [], time: { start: 0, stop: 5, step: 1 } } as unknown as IR;
const stubResult: SimulationResult = { rows: [{ time: 0 }], diagnostics: [] };

beforeEach(() => {
  FakeWorker.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SimulatorClient", () => {
  test("posts a simulate request with an auto-incrementing jobId", () => {
    const client = new SimulatorClient(() => new FakeWorker() as unknown as Worker);
    client.simulate(stubIR);
    client.simulate(stubIR);
    const worker = FakeWorker.instances[0]!;
    expect(worker.postedMessages.length).toBe(2);
    expect(worker.postedMessages[0]?.type).toBe("simulate");
    expect(worker.postedMessages[0]?.jobId).toBe(1);
    expect(worker.postedMessages[1]?.jobId).toBe(2);
  });

  test("invokes onResult with the result when the latest jobId responds", () => {
    const client = new SimulatorClient(() => new FakeWorker() as unknown as Worker);
    const onResult = vi.fn();
    client.onResult(onResult);
    client.simulate(stubIR);
    const worker = FakeWorker.instances[0]!;
    worker.fire({ type: "result", jobId: 1, result: stubResult });
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(stubResult);
  });

  test("discards stale results with non-latest jobId", () => {
    const client = new SimulatorClient(() => new FakeWorker() as unknown as Worker);
    const onResult = vi.fn();
    client.onResult(onResult);
    client.simulate(stubIR);
    client.simulate(stubIR);
    const worker = FakeWorker.instances[0]!;
    worker.fire({ type: "result", jobId: 1, result: stubResult });
    expect(onResult).not.toHaveBeenCalled();
    worker.fire({ type: "result", jobId: 2, result: stubResult });
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  test("invokes onError with the message when the latest jobId errors", () => {
    const client = new SimulatorClient(() => new FakeWorker() as unknown as Worker);
    const onError = vi.fn();
    client.onError(onError);
    client.simulate(stubIR);
    const worker = FakeWorker.instances[0]!;
    worker.fire({ type: "error", jobId: 1, message: "boom", diagnostic: null });
    expect(onError).toHaveBeenCalledWith("boom");
  });

  test("discards stale errors with non-latest jobId", () => {
    const client = new SimulatorClient(() => new FakeWorker() as unknown as Worker);
    const onError = vi.fn();
    client.onError(onError);
    client.simulate(stubIR);
    client.simulate(stubIR);
    const worker = FakeWorker.instances[0]!;
    worker.fire({ type: "error", jobId: 1, message: "stale", diagnostic: null });
    expect(onError).not.toHaveBeenCalled();
  });

  test("dispose() terminates the worker", () => {
    const client = new SimulatorClient(() => new FakeWorker() as unknown as Worker);
    client.dispose();
    const worker = FakeWorker.instances[0]!;
    expect(worker.terminated).toBe(true);
  });
});
