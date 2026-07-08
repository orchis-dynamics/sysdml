import type * as monaco from "monaco-editor";

import { SYSDML_LANGUAGE_ID } from "../monaco/sysdml-language";
import {
	lspCompletionItemToMonaco,
	lspDocumentSymbolsToMonaco,
	lspHoverToMonaco,
	lspLocationToMonaco,
	lspTextEditToMonaco,
	monacoPositionToLsp,
} from "./adapters";
import type { LspClient } from "./lsp-client";

export interface MonacoProviderRegistrar {
	languages: {
		registerCompletionItemProvider(
			languageId: string,
			provider: monaco.languages.CompletionItemProvider,
		): monaco.IDisposable;
		registerHoverProvider(
			languageId: string,
			provider: monaco.languages.HoverProvider,
		): monaco.IDisposable;
		registerDefinitionProvider(
			languageId: string,
			provider: monaco.languages.DefinitionProvider,
		): monaco.IDisposable;
		registerDocumentSymbolProvider(
			languageId: string,
			provider: monaco.languages.DocumentSymbolProvider,
		): monaco.IDisposable;
		registerDocumentFormattingEditProvider(
			languageId: string,
			provider: monaco.languages.DocumentFormattingEditProvider,
		): monaco.IDisposable;
	};
}

type AssertRealMonacoIsAssignable =
	typeof import("monaco-editor") extends MonacoProviderRegistrar ? true : never;
const assertRealMonacoIsAssignable: AssertRealMonacoIsAssignable = true;
void assertRealMonacoIsAssignable;

function wordRange(
	model: monaco.editor.ITextModel,
	position: monaco.Position,
): monaco.IRange {
	const word = model.getWordUntilPosition(position);
	return {
		startLineNumber: position.lineNumber,
		startColumn: word.startColumn,
		endLineNumber: position.lineNumber,
		endColumn: word.endColumn,
	};
}

function createCompletionProvider(
	client: LspClient,
): monaco.languages.CompletionItemProvider {
	return {
		triggerCharacters: [" ", ":"],
		async provideCompletionItems(model, position) {
			const uri = model.uri.toString();
			const response = await client.completion(
				uri,
				monacoPositionToLsp(position),
			);
			const items = Array.isArray(response)
				? response
				: (response?.items ?? []);
			const range = wordRange(model, position);
			return {
				suggestions: items.map((item) =>
					lspCompletionItemToMonaco(item, range),
				),
			};
		},
	};
}

function createHoverProvider(
	client: LspClient,
): monaco.languages.HoverProvider {
	return {
		async provideHover(model, position) {
			const response = await client.hover(
				model.uri.toString(),
				monacoPositionToLsp(position),
			);
			if (!response) return null;
			return lspHoverToMonaco(response);
		},
	};
}

function createDefinitionProvider(
	client: LspClient,
): monaco.languages.DefinitionProvider {
	return {
		async provideDefinition(model, position) {
			const response = await client.definition(
				model.uri.toString(),
				monacoPositionToLsp(position),
			);
			if (!response) return null;
			const locations = Array.isArray(response) ? response : [response];
			return locations.map((location) =>
				lspLocationToMonaco(location, model.uri),
			);
		},
	};
}

function createDocumentSymbolProvider(
	client: LspClient,
): monaco.languages.DocumentSymbolProvider {
	return {
		async provideDocumentSymbols(model) {
			const response = await client.documentSymbols(model.uri.toString());
			if (!response) return [];
			return lspDocumentSymbolsToMonaco(response);
		},
	};
}

function createFormattingProvider(
	client: LspClient,
): monaco.languages.DocumentFormattingEditProvider {
	return {
		async provideDocumentFormattingEdits(model, options) {
			const response = await client.formatting(model.uri.toString(), {
				tabSize: options.tabSize,
				insertSpaces: options.insertSpaces,
			});
			if (!response) return [];
			return response.map((edit) => lspTextEditToMonaco(edit, model));
		},
	};
}

export function registerSysdmlProviders(
	monacoApi: MonacoProviderRegistrar,
	client: LspClient,
): monaco.IDisposable[] {
	return [
		monacoApi.languages.registerCompletionItemProvider(
			SYSDML_LANGUAGE_ID,
			createCompletionProvider(client),
		),
		monacoApi.languages.registerHoverProvider(
			SYSDML_LANGUAGE_ID,
			createHoverProvider(client),
		),
		monacoApi.languages.registerDefinitionProvider(
			SYSDML_LANGUAGE_ID,
			createDefinitionProvider(client),
		),
		monacoApi.languages.registerDocumentSymbolProvider(
			SYSDML_LANGUAGE_ID,
			createDocumentSymbolProvider(client),
		),
		monacoApi.languages.registerDocumentFormattingEditProvider(
			SYSDML_LANGUAGE_ID,
			createFormattingProvider(client),
		),
	];
}
