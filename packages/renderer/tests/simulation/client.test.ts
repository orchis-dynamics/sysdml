import type { SimulationResult } from "@sysdml/contracts";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { SimulatorClient } from "../../src/simulation/client.js";
import type {
	SimulationWorker,
	SimulationWorkerEventMap,
} from "../../src/simulation/client.js";
import type {
	WorkerRequest,
	WorkerResponse,
} from "../../src/simulation/types.js";
import { ir } from "../helpers/ir-builders.js";

class FakeWorker implements SimulationWorker {
	static instances: FakeWorker[] = [];
	postedMessages: WorkerRequest[] = [];
	terminated = false;
	private listeners: {
		[EventName in keyof SimulationWorkerEventMap]: Array<
			(event: SimulationWorkerEventMap[EventName]) => void
		>;
	} = { message: [], error: [], messageerror: [] };

	constructor() {
		FakeWorker.instances.push(this);
	}

	postMessage(message: WorkerRequest): void {
		this.postedMessages.push(message);
	}

	addEventListener<EventName extends keyof SimulationWorkerEventMap>(
		type: EventName,
		listener: (event: SimulationWorkerEventMap[EventName]) => void,
	): void {
		this.listeners[type].push(listener);
	}

	terminate(): void {
		this.terminated = true;
	}

	fire(response: WorkerResponse): void {
		this.listeners.message.forEach((listener) => listener({ data: response }));
	}

	fireError(message: string): void {
		this.listeners.error.forEach((listener) =>
			listener({ message, filename: "", lineno: 0 }),
		);
	}

	fireMessageError(): void {
		this.listeners.messageerror.forEach((listener) => listener(undefined));
	}
}

function createClient(): SimulatorClient {
	return new SimulatorClient(() => new FakeWorker());
}

function fakeWorkerAt(index: number): FakeWorker {
	const instance = FakeWorker.instances[index];
	if (!instance) {
		throw new Error(`No FakeWorker instance at index ${index}`);
	}
	return instance;
}

const stubIR = ir();
const stubResult: SimulationResult = { rows: [{ time: 0 }], diagnostics: [] };

beforeEach(() => {
	FakeWorker.instances = [];
});

describe("SimulatorClient", () => {
	test("posts a simulate request with an auto-incrementing jobId", () => {
		const client = createClient();
		client.simulate(stubIR);
		client.simulate(stubIR);
		const worker = fakeWorkerAt(0);
		expect(worker.postedMessages.length).toBe(2);
		expect(worker.postedMessages[0]?.type).toBe("simulate");
		expect(worker.postedMessages[0]?.jobId).toBe(1);
		expect(worker.postedMessages[1]?.jobId).toBe(2);
	});

	test("invokes onResult with the result when the latest jobId responds", () => {
		const client = createClient();
		const onResult = vi.fn();
		client.onResult(onResult);
		client.simulate(stubIR);
		fakeWorkerAt(0).fire({ type: "result", jobId: 1, result: stubResult });
		expect(onResult).toHaveBeenCalledTimes(1);
		expect(onResult).toHaveBeenCalledWith(stubResult);
	});

	test("discards stale results with non-latest jobId", () => {
		const client = createClient();
		const onResult = vi.fn();
		client.onResult(onResult);
		client.simulate(stubIR);
		client.simulate(stubIR);
		const worker = fakeWorkerAt(0);
		worker.fire({ type: "result", jobId: 1, result: stubResult });
		expect(onResult).not.toHaveBeenCalled();
		worker.fire({ type: "result", jobId: 2, result: stubResult });
		expect(onResult).toHaveBeenCalledTimes(1);
	});

	test("invokes onError with the message when the latest jobId errors", () => {
		const client = createClient();
		const onError = vi.fn();
		client.onError(onError);
		client.simulate(stubIR);
		fakeWorkerAt(0).fire({ type: "error", jobId: 1, message: "boom" });
		expect(onError).toHaveBeenCalledWith("boom");
	});

	test("discards stale errors with non-latest jobId", () => {
		const client = createClient();
		const onError = vi.fn();
		client.onError(onError);
		client.simulate(stubIR);
		client.simulate(stubIR);
		fakeWorkerAt(0).fire({ type: "error", jobId: 1, message: "stale" });
		expect(onError).not.toHaveBeenCalled();
	});

	test("surfaces a worker error event through onError", () => {
		const client = createClient();
		const onError = vi.fn();
		client.onError(onError);
		fakeWorkerAt(0).fireError("ReferenceError: process is not defined");
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(
			expect.stringContaining("ReferenceError: process is not defined"),
		);
	});

	test("surfaces a worker messageerror through onError", () => {
		const client = createClient();
		const onError = vi.fn();
		client.onError(onError);
		fakeWorkerAt(0).fireMessageError();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	test("ignores worker error events after dispose", () => {
		const client = createClient();
		const onError = vi.fn();
		client.onError(onError);
		client.dispose();
		fakeWorkerAt(0).fireError("too late");
		expect(onError).not.toHaveBeenCalled();
	});

	test("dispose() terminates the worker", () => {
		const client = createClient();
		client.dispose();
		expect(fakeWorkerAt(0).terminated).toBe(true);
	});
});
