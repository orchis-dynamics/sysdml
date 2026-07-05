import type {
	GetIRParams,
	GetIRResult,
	UpdateConnectionRoutingParams,
} from "@sysdml/contracts";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	TextDocumentSyncKind,
	TextEdit,
	Range,
	TextDocumentEdit,
	OptionalVersionedTextDocumentIdentifier,
	ShowMessageNotification,
	MessageType,
} from "vscode-languageserver/node.js";

import { analyzeDocument } from "./analysis.js";
import {
	setAnalysis,
	getAnalysis,
	getLastParsedAnalysis,
	deleteAnalysis,
} from "./documents.js";
import { getCompletionItems } from "./features/completion.js";
import { getDefinitionLocation } from "./features/definition.js";
import { formatSource } from "./features/formatting.js";
import { getHoverContent } from "./features/hover.js";
import { computeConnectionRoutingEdits } from "./features/routing-edit.js";
import { getDocumentSymbols } from "./features/symbols.js";

function startServer(connection: ReturnType<typeof createConnection>): void {
	const documents = new TextDocuments(TextDocument);

	connection.onInitialize(() => ({
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			hoverProvider: true,
			completionProvider: { triggerCharacters: [" ", ":"] },
			definitionProvider: true,
			documentSymbolProvider: true,
			documentFormattingProvider: true,
		},
	}));

	documents.onDidChangeContent((change) => {
		const analysis = analyzeDocument(change.document.getText());
		setAnalysis(change.document.uri, analysis);
		connection.sendDiagnostics({
			uri: change.document.uri,
			diagnostics: analysis.diagnostics,
		});
	});

	documents.onDidClose((event) => {
		deleteAnalysis(event.document.uri);
		connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	});

	connection.onHover((params) => {
		const analysis = getAnalysis(params.textDocument.uri);
		if (!analysis?.ast) return null;
		return getHoverContent(analysis.ast, analysis.ir, params.position);
	});

	connection.onCompletion((params) => {
		const doc = documents.get(params.textDocument.uri);
		if (!doc) return [];
		const analysis = getLastParsedAnalysis(params.textDocument.uri);
		return getCompletionItems(
			doc.getText(),
			analysis?.ast ?? null,
			analysis?.ir ?? null,
			params.position,
		);
	});

	connection.onDefinition((params) => {
		const analysis = getAnalysis(params.textDocument.uri);
		if (!analysis?.ast) return null;
		return getDefinitionLocation(
			analysis.ast,
			params.textDocument.uri,
			params.position,
		);
	});

	connection.onDocumentSymbol((params) => {
		const analysis = getAnalysis(params.textDocument.uri);
		if (!analysis?.ast) return [];
		return getDocumentSymbols(analysis.ast);
	});

	connection.onDocumentFormatting((params) => {
		const doc = documents.get(params.textDocument.uri);
		if (!doc) return [];
		const source = doc.getText();
		const formatted = formatSource(source);
		if (formatted === null || formatted === source) return [];
		const lastLine = doc.lineCount - 1;
		const lastChar = doc.getText().split("\n").at(-1)?.length ?? 0;
		return [
			TextEdit.replace(Range.create(0, 0, lastLine, lastChar), formatted),
		];
	});

	connection.onRequest("sysdml/getIR", (params: GetIRParams): GetIRResult => {
		const analysis = getAnalysis(params.uri);
		return {
			ir: analysis?.ir ?? null,
			diagnostics: analysis?.irDiagnostics ?? [],
		};
	});

	connection.onNotification(
		"sysdml/updateConnectionRouting",
		async (params: UpdateConnectionRoutingParams) => {
			const document = documents.get(params.uri);
			const analysis = getAnalysis(params.uri);
			if (!document || !analysis?.ast) {
				void connection.sendNotification(ShowMessageNotification.type, {
					type: MessageType.Warning,
					message:
						"SysDML: cannot apply routing edit while the file has parse errors",
				});
				return;
			}
			const result = computeConnectionRoutingEdits(
				analysis.ast,
				document.getText(),
				params,
			);
			if ("error" in result) {
				void connection.sendNotification(ShowMessageNotification.type, {
					type: MessageType.Warning,
					message: `SysDML: ${result.error}`,
				});
				return;
			}
			const response = await connection.workspace.applyEdit({
				edit: {
					documentChanges: [
						TextDocumentEdit.create(
							OptionalVersionedTextDocumentIdentifier.create(
								params.uri,
								document.version,
							),
							result.edits,
						),
					],
				},
			});
			if (!response.applied) {
				void connection.sendNotification(ShowMessageNotification.type, {
					type: MessageType.Warning,
					message:
						"SysDML: routing edit was not applied (document changed during the drag)",
				});
			}
		},
	);

	documents.listen(connection);
	connection.listen();
}

startServer(createConnection(ProposedFeatures.all));
