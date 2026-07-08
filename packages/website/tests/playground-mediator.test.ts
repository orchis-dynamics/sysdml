import type { GetIRResult, IR } from "@sysdml/contracts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { LspClient } from "../app/lib/lsp/lsp-client";
import {
	createPlaygroundMediator,
	PLAYGROUND_URI,
} from "../app/lib/playground-mediator";

interface FakeContentChange {
	range: {
		startLineNumber: number;
		startColumn: number;
		endLineNumber: number;
		endColumn: number;
	};
	text: string;
}

const validIr: IR = {
	ir_version: "0.1",
	model: { id: "m", kind: "sfd" },
	time: { start: 0, end: 1, step: 1 },
	stocks: [],
	auxiliaries: [],
	flows: [],
	connections: [],
	graphicalFunctions: [],
};

function makeClient(getIrResult: GetIRResult) {
	const didOpen = vi.fn();
	const didChange = vi.fn();
	const getIR = vi.fn(async () => getIrResult);
	const updateConnectionRouting = vi.fn();
	const client: LspClient = {
		initialize: vi.fn(async () => undefined),
		didOpen,
		didChange,
		getIR,
		updateConnectionRouting,
		updateElementPositions: vi.fn(),
		pinMissingPositions: vi.fn(),
		completion: vi.fn(async () => null),
		hover: vi.fn(async () => null),
		definition: vi.fn(async () => null),
		documentSymbols: vi.fn(async () => null),
		formatting: vi.fn(async () => null),
		onDiagnostics: vi.fn(),
		onApplyEdit: vi.fn(),
		onShowMessage: vi.fn(),
		dispose: vi.fn(),
	};
	return { client, didOpen, didChange, getIR, updateConnectionRouting };
}

function makeModel(initialText: string) {
	let version = 1;
	const changeHandlers: ((event: { changes: FakeContentChange[] }) => void)[] =
		[];
	return {
		getValue: (): string => initialText,
		getVersionId: (): number => version,
		bumpVersion: (): void => {
			version += 1;
		},
		onDidChangeContent: (
			handler: (event: { changes: FakeContentChange[] }) => void,
		): { dispose: () => void } => {
			changeHandlers.push(handler);
			return { dispose: () => undefined };
		},
		emitChange: (text: string): void => {
			version += 1;
			for (const handler of changeHandlers) {
				handler({
					changes: [
						{
							range: {
								startLineNumber: 1,
								startColumn: 1,
								endLineNumber: 1,
								endColumn: 1,
							},
							text,
						},
					],
				});
			}
		},
	};
}

const monacoBridge = {
	setMarkers: vi.fn(),
	applyEdits: vi.fn(() => true),
};

describe("playground-mediator", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		monacoBridge.setMarkers.mockClear();
		monacoBridge.applyEdits.mockClear();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test("start opens the doc, fetches IR, and pushes it", async () => {
		const { client, didOpen, getIR } = makeClient({
			ir: validIr,
			diagnostics: [],
		});
		const model = makeModel("sfd demo\n");
		const onIr = vi.fn();
		const mediator = createPlaygroundMediator({
			client,
			model,
			monacoApi: monacoBridge,
			callbacks: { onIr, onError: vi.fn(), onToast: vi.fn() },
		});
		await mediator.start();
		expect(didOpen).toHaveBeenCalledWith(
			PLAYGROUND_URI,
			"sfd demo\n",
			expect.any(Number),
		);
		expect(getIR).toHaveBeenCalledWith(PLAYGROUND_URI);
		expect(onIr).toHaveBeenCalledWith(validIr);
	});

	test("edits are debounced into a single getIR", async () => {
		const { client, didChange, getIR } = makeClient({
			ir: null,
			diagnostics: [],
		});
		const model = makeModel("sfd demo\n");
		const mediator = createPlaygroundMediator({
			client,
			model,
			monacoApi: monacoBridge,
			callbacks: { onIr: vi.fn(), onError: vi.fn(), onToast: vi.fn() },
			debounceMs: 200,
		});
		await mediator.start();
		getIR.mockClear();
		model.emitChange("a");
		model.emitChange("b");
		model.emitChange("c");
		expect(didChange).toHaveBeenCalledTimes(3);
		expect(getIR).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(200);
		expect(getIR).toHaveBeenCalledTimes(1);
	});

	test("null IR keeps last good IR and reports the banner", async () => {
		const { client, getIR } = makeClient({ ir: validIr, diagnostics: [] });
		const model = makeModel("sfd demo\n");
		const onIr = vi.fn();
		const onError = vi.fn();
		const mediator = createPlaygroundMediator({
			client,
			model,
			monacoApi: monacoBridge,
			callbacks: { onIr, onError, onToast: vi.fn() },
			debounceMs: 200,
		});
		await mediator.start();
		getIR.mockResolvedValue({ ir: null, diagnostics: [] });
		onIr.mockClear();
		model.emitChange("broken");
		await vi.advanceTimersByTimeAsync(200);
		expect(onIr).not.toHaveBeenCalledWith(null);
		expect(onError).toHaveBeenCalledWith(
			"No IR available — check for diagnostics",
		);
	});

	test("routing edits are forwarded to the client with the URI", async () => {
		const { client, updateConnectionRouting } = makeClient({
			ir: null,
			diagnostics: [],
		});
		const model = makeModel("sfd demo\n");
		const mediator = createPlaygroundMediator({
			client,
			model,
			monacoApi: monacoBridge,
			callbacks: { onIr: vi.fn(), onError: vi.fn(), onToast: vi.fn() },
		});
		await mediator.start();
		mediator.handleRoutingEdit({
			connection: { from: "a", polarity: "+", to: "b", occurrence: 0 },
			angle: 45,
		});
		expect(updateConnectionRouting).toHaveBeenCalledWith(
			expect.objectContaining({ uri: PLAYGROUND_URI, angle: 45 }),
		);
	});
});
