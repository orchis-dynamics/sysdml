import type {
	ConnectionRoutingEdit,
	ElementPositionEdit,
	IR,
} from "@sysdml/contracts";
import type {
	ApplyWorkspaceEditParams,
	ApplyWorkspaceEditResult,
	Diagnostic,
	TextEdit,
} from "vscode-languageserver-protocol";

import { monacoChangeToLspContentChange } from "./lsp/adapters";
import type { LspClient } from "./lsp/lsp-client";

export const PLAYGROUND_URI = "inmemory://playground.sysdml";

const DEFAULT_DEBOUNCE_MS = 200;
const NO_IR_MESSAGE = "No IR available — check for diagnostics";

interface ModelContentChange {
	range: {
		startLineNumber: number;
		startColumn: number;
		endLineNumber: number;
		endColumn: number;
	};
	text: string;
}

export interface MediatorModel {
	getValue(): string;
	getVersionId(): number;
	onDidChangeContent(
		handler: (event: { changes: ModelContentChange[] }) => void,
	): { dispose(): void };
}

export interface MonacoBridge {
	setMarkers(diagnostics: Diagnostic[]): void;
	applyEdits(edits: TextEdit[], expectedVersion: number): boolean;
}

export interface MediatorCallbacks {
	onIr(ir: IR | null): void;
	onError(message: string | null): void;
	onToast(message: string): void;
}

export interface Mediator {
	start(): Promise<void>;
	handleRoutingEdit(edit: ConnectionRoutingEdit): void;
	handlePositionEdits(edits: ElementPositionEdit[]): void;
	handlePinMissingPositions(): void;
	dispose(): void;
}

export function createPlaygroundMediator(deps: {
	client: LspClient;
	model: MediatorModel;
	monacoApi: MonacoBridge;
	callbacks: MediatorCallbacks;
	debounceMs?: number;
}): Mediator {
	const { client, model, monacoApi, callbacks } = deps;
	const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let subscription: { dispose(): void } | null = null;
	let lastGoodIr: IR | null = null;

	client.onDiagnostics((uri, diagnostics) => {
		if (uri !== PLAYGROUND_URI) return;
		monacoApi.setMarkers(diagnostics);
	});

	client.onApplyEdit(
		(params: ApplyWorkspaceEditParams): ApplyWorkspaceEditResult => {
			const documentChanges = params.edit.documentChanges ?? [];
			for (const documentChange of documentChanges) {
				if (!("textDocument" in documentChange)) continue;
				if (documentChange.textDocument.uri !== PLAYGROUND_URI) continue;
				const expectedVersion = documentChange.textDocument.version;
				const applied = monacoApi.applyEdits(
					documentChange.edits,
					expectedVersion ?? model.getVersionId(),
				);
				if (!applied) {
					return { applied: false };
				}
			}
			return { applied: true };
		},
	);

	client.onShowMessage((params) => {
		callbacks.onToast(params.message);
	});

	async function refreshIr(): Promise<void> {
		const result = await client.getIR(PLAYGROUND_URI);
		if (result.ir) {
			lastGoodIr = result.ir;
			callbacks.onError(null);
			callbacks.onIr(result.ir);
		} else {
			callbacks.onError(NO_IR_MESSAGE);
			callbacks.onIr(lastGoodIr);
		}
	}

	function scheduleRefresh(): void {
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			void refreshIr();
		}, debounceMs);
	}

	return {
		async start(): Promise<void> {
			await client.initialize();
			client.didOpen(PLAYGROUND_URI, model.getValue(), model.getVersionId());
			subscription = model.onDidChangeContent((event) => {
				const changes = event.changes.map((change) =>
					monacoChangeToLspContentChange(change),
				);
				client.didChange(PLAYGROUND_URI, model.getVersionId(), changes);
				scheduleRefresh();
			});
			await refreshIr();
		},
		handleRoutingEdit(edit): void {
			client.updateConnectionRouting({ uri: PLAYGROUND_URI, ...edit });
		},
		handlePositionEdits(edits): void {
			client.updateElementPositions({
				uri: PLAYGROUND_URI,
				positions: edits,
			});
		},
		handlePinMissingPositions(): void {
			client.pinMissingPositions({ uri: PLAYGROUND_URI });
		},
		dispose(): void {
			if (debounceTimer !== null) clearTimeout(debounceTimer);
			subscription?.dispose();
		},
	};
}
