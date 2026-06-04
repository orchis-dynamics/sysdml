import type { WasmSource, WasmSourceProvider } from "@simlin/engine";

let configuredWasmSource: WasmSource | WasmSourceProvider | undefined;

export function configureSimulatorWasm(
	source: WasmSource | WasmSourceProvider,
): void {
	configuredWasmSource = source;
}

export function getConfiguredWasmSource():
	| WasmSource
	| WasmSourceProvider
	| undefined {
	return configuredWasmSource;
}
