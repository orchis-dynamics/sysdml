function throwWorkerBackendUnavailable(): never {
	throw new Error(
		"@sysdml/simulator bundles only the in-thread DirectBackend; the Simlin worker backend is not included.",
	);
}

export function getBackend(): never {
	return throwWorkerBackendUnavailable();
}

export function resetBackend(): never {
	return throwWorkerBackendUnavailable();
}
