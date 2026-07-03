/// <reference lib="webworker" />

import { SimlinSimulator } from "@sysdml/simulator";

import { handleSimulationRequest } from "./handler.js";

declare const self: DedicatedWorkerGlobalScope;

const simulator = new SimlinSimulator();

self.addEventListener("message", (event: MessageEvent<unknown>) => {
	void handleSimulationRequest(event.data, simulator).then((response) => {
		self.postMessage(response);
	});
});
