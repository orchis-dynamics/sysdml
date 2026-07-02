import type { IR, SimulationResult } from "@sysdml/contracts";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { SimulatorClient } from "../../src/simulation/client.js";
import type {
	WorkerRequest,
	WorkerResponse,
} from "../../src/simulation/types.js";

class FakeWorker {
	static instances: FakeWorker[] = [];
	postedMessages: WorkerRequest[] = [];
	terminated = false;
	private messageListeners: Array<
		(event: MessageEvent<WorkerResponse>) => void
	> = [];
	private errorListeners: Array<(event: ErrorEvent) => void> = [];
	private messageErrorListeners: Array<(event: MessageEvent) => void> = [];

	constructor() {
		FakeWorker.instances.push(this);
	}

	postMessage(message: WorkerRequest): void {
		this.postedMessages.push(message);
	}

	addEventListener(
		type: "message",
		cb: (event: MessageEvent<WorkerResponse>) => void,
	): void;
	addEventListener(type: "error", cb: (event: ErrorEvent) => void): void;
	addEventListener(
		type: "messageerror",
		cb: (event: MessageEvent) => void,
	): void;
	addEventListener(type: string, cb: (event: never) => void): void {
		if (type === "message") {
			this.messageListeners.push(
				cb as (event: MessageEvent<WorkerResponse>) => void,
			);
		} else if (type === "error") {
			this.errorListeners.push(cb as (event: ErrorEvent) => void);
		} else if (type === "messageerror") {
			this.messageErrorListeners.push(cb as (event: MessageEvent) => void);
		}
	}

	terminate(): void {
		this.terminated = true;
	}

	fire(response: WorkerResponse): void {
		const event = { data: response } as MessageEvent<WorkerResponse>;
		for (const cb of this.messageListeners) cb(event);
	}

	fireError(message: string): void {
		const event = { message } as ErrorEvent;
		for (const cb of this.errorListeners) cb(event);
	}

	fireMessageError(): void {
		const event = {} as MessageEvent;
		for (const cb of this.messageErrorListeners) cb(event);
	}
}

const stubIR = {
	stocks: [],
	flows: [],
	auxiliaries: [],
	graphicalFunctions: [],
	time: { start: 0, stop: 5, step: 1 },
} as unknown as IR;
const stubResult: SimulationResult = { rows: [{ time: 0 }], diagnostics: [] };

beforeEach(() => {
	FakeWorker.instances = [];
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("SimulatorClient", () => {
	test("posts a simulate request with an auto-incrementing jobId", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		client.simulate(stubIR);
		client.simulate(stubIR);
		const worker = FakeWorker.instances[0]!;
		expect(worker.postedMessages.length).toBe(2);
		expect(worker.postedMessages[0]?.type).toBe("simulate");
		expect(worker.postedMessages[0]?.jobId).toBe(1);
		expect(worker.postedMessages[1]?.jobId).toBe(2);
	});

	test("invokes onResult with the result when the latest jobId responds", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		const onResult = vi.fn();
		client.onResult(onResult);
		client.simulate(stubIR);
		const worker = FakeWorker.instances[0]!;
		worker.fire({ type: "result", jobId: 1, result: stubResult });
		expect(onResult).toHaveBeenCalledTimes(1);
		expect(onResult).toHaveBeenCalledWith(stubResult);
	});

	test("discards stale results with non-latest jobId", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
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
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		const onError = vi.fn();
		client.onError(onError);
		client.simulate(stubIR);
		const worker = FakeWorker.instances[0]!;
		worker.fire({ type: "error", jobId: 1, message: "boom", diagnostic: null });
		expect(onError).toHaveBeenCalledWith("boom");
	});

	test("discards stale errors with non-latest jobId", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		const onError = vi.fn();
		client.onError(onError);
		client.simulate(stubIR);
		client.simulate(stubIR);
		const worker = FakeWorker.instances[0]!;
		worker.fire({
			type: "error",
			jobId: 1,
			message: "stale",
			diagnostic: null,
		});
		expect(onError).not.toHaveBeenCalled();
	});

	test("surfaces a worker error event through onError", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		const onError = vi.fn();
		client.onError(onError);
		const worker = FakeWorker.instances[0]!;
		worker.fireError("ReferenceError: process is not defined");
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0]![0]).toContain(
			"ReferenceError: process is not defined",
		);
	});

	test("surfaces a worker messageerror through onError", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		const onError = vi.fn();
		client.onError(onError);
		const worker = FakeWorker.instances[0]!;
		worker.fireMessageError();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	test("ignores worker error events after dispose", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		const onError = vi.fn();
		client.onError(onError);
		client.dispose();
		const worker = FakeWorker.instances[0]!;
		worker.fireError("too late");
		expect(onError).not.toHaveBeenCalled();
	});

	test("dispose() terminates the worker", () => {
		const client = new SimulatorClient(
			() => new FakeWorker() as unknown as Worker,
		);
		client.dispose();
		const worker = FakeWorker.instances[0]!;
		expect(worker.terminated).toBe(true);
	});
});
