import { describe, expect, test, vi } from "vitest";

import type { LspClient } from "../app/lib/lsp/lsp-client";
import { registerSysdmlProviders } from "../app/lib/lsp/providers";
import type { MonacoProviderRegistrar } from "../app/lib/lsp/providers";

function fakeMonaco() {
	const disposable = { dispose: vi.fn() };
	const registerCompletionItemProvider = vi.fn(() => disposable);
	const registerHoverProvider = vi.fn(() => disposable);
	const registerDefinitionProvider = vi.fn(() => disposable);
	const registerDocumentSymbolProvider = vi.fn(() => disposable);
	const registerDocumentFormattingEditProvider = vi.fn(() => disposable);
	const monacoApi: MonacoProviderRegistrar = {
		languages: {
			registerCompletionItemProvider,
			registerHoverProvider,
			registerDefinitionProvider,
			registerDocumentSymbolProvider,
			registerDocumentFormattingEditProvider,
		},
	};
	return {
		monacoApi,
		registerCompletionItemProvider,
		registerHoverProvider,
		registerDefinitionProvider,
		registerDocumentSymbolProvider,
		registerDocumentFormattingEditProvider,
	};
}

function fakeClient(): LspClient {
	return {
		initialize: vi.fn(),
		didOpen: vi.fn(),
		didChange: vi.fn(),
		getIR: vi.fn(),
		updateConnectionRouting: vi.fn(),
		updateElementPositions: vi.fn(),
		pinMissingPositions: vi.fn(),
		completion: vi.fn(),
		hover: vi.fn(),
		definition: vi.fn(),
		documentSymbols: vi.fn(),
		formatting: vi.fn(),
		onDiagnostics: vi.fn(),
		onApplyEdit: vi.fn(),
		onShowMessage: vi.fn(),
		dispose: vi.fn(),
	};
}

describe("providers", () => {
	test("registers one provider per supported feature", () => {
		const {
			monacoApi,
			registerCompletionItemProvider,
			registerHoverProvider,
			registerDefinitionProvider,
			registerDocumentSymbolProvider,
			registerDocumentFormattingEditProvider,
		} = fakeMonaco();
		const client = fakeClient();
		const disposables = registerSysdmlProviders(monacoApi, client);
		expect(registerCompletionItemProvider).toHaveBeenCalledTimes(1);
		expect(registerHoverProvider).toHaveBeenCalledTimes(1);
		expect(registerDefinitionProvider).toHaveBeenCalledTimes(1);
		expect(registerDocumentSymbolProvider).toHaveBeenCalledTimes(1);
		expect(registerDocumentFormattingEditProvider).toHaveBeenCalledTimes(1);
		expect(disposables).toHaveLength(5);
	});
});
