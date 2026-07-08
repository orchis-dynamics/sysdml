import type { IR } from "@sysdml/contracts";
import { createInjectionState } from "@vueuse/core";
import type { Ref } from "vue";

const [useProvideModelState, useInjectedModelState] = createInjectionState(
	(ir: Ref<IR | null>) => ({ ir }),
);

export { useProvideModelState };

export function useModelState() {
	const state = useInjectedModelState();
	if (!state) {
		throw new Error(
			"useModelState() was called without a provider. Call useProvideModelState() in an ancestor component.",
		);
	}
	return state;
}
