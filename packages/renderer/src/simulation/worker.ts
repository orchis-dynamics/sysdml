/// <reference lib="webworker" />

import { SimlinSimulator } from "@sysdml/simulator";

import { handleSimulationRequest } from "./handler.js";
import type { WorkerRequest } from "./types.js";

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
