import * as net from "node:net";

import type { IR, IRDiagnostic } from "@sysdml/ir";
import {
	SocketMessageReader,
	SocketMessageWriter,
} from "vscode-jsonrpc/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	TextDocumentSyncKind,
	TextEdit,
	Range,
} from "vscode-languageserver/node.js";

import { analyzeDocument } from "./analysis.js";
import { setAnalysis, getAnalysis, deleteAnalysis } from "./documents.js";
import { getCompletionItems } from "./features/completion.js";
import { getDefinitionLocation } from "./features/definition.js";
import { formatSource } from "./features/formatting.js";
import { getHoverContent } from "./features/hover.js";
import { getDocumentSymbols } from "./features/symbols.js";

interface GetIRParams {
	uri: string;
}

interface GetIRResult {
	ir: IR | null;
	diagnostics: IRDiagnostic[];
}

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
		const analysis = getAnalysis(params.textDocument.uri);
		if (!doc) return [];
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

	documents.listen(connection);
	connection.listen();
}

const portArgIndex = process.argv.indexOf("--port");
if (portArgIndex !== -1) {
	const port = parseInt(process.argv[portArgIndex + 1], 10);
	const server = net.createServer((socket) => {
		const reader = new SocketMessageReader(socket);
		const writer = new SocketMessageWriter(socket);
		const conn = createConnection(ProposedFeatures.all, reader, writer);
		startServer(conn);
	});
	server.listen(port, () => {
		process.stderr.write(`sysdml-lsp listening on port ${port}\n`);
	});
} else {
	const conn = createConnection(ProposedFeatures.all);
	startServer(conn);
}
