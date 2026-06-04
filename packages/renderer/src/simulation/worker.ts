/// <reference lib="webworker" />

import { configureSimulatorWasm, SimlinSimulator } from "@sysdml/simulator";
import wasmUrl from "@simlin/engine/core/libsimlin.wasm?url";

import { handleSimulationRequest } from "./handler.js";
import type { WorkerRequest } from "./types.js";

configureSimulatorWasm(wasmUrl);

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
const simulator = new SimlinSimulator();

workerScope.addEventListener(
	"message",
	(event: MessageEvent<WorkerRequest>) => {
		void handleSimulationRequest(event.data, simulator).then((response) => {
			workerScope.postMessage(response);
		});
	},
);
