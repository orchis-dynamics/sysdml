/// <reference lib="webworker" />

import { handleSimulationRequest } from "./handler.js";
import type { WorkerRequest } from "./types.js";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const response = handleSimulationRequest(event.data);
  workerScope.postMessage(response);
});
