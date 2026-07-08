import type {
	GetIRResult,
	PinMissingPositionsParams,
	UpdateConnectionRoutingParams,
	UpdateElementPositionsParams,
} from "@sysdml/contracts";
import type {
	ApplyWorkspaceEditParams,
	ApplyWorkspaceEditResult,
	CompletionItem,
	CompletionList,
	Diagnostic,
	DocumentSymbol,
	FormattingOptions,
	Hover,
	Location,
	Position,
	PublishDiagnosticsParams,
	ShowMessageParams,
	TextEdit,
} from "vscode-languageserver-protocol";

export interface LspConnection {
	sendRequest<Result>(method: string, params: unknown): Promise<Result>;
	sendNotification(method: string, params: unknown): void;
	onNotification<NotificationParams>(
		method: string,
		handler: (params: NotificationParams) => void,
	): void;
	onRequest<RequestParams, RequestResult>(
		method: string,
		handler: (params: RequestParams) => RequestResult,
	): void;
	listen(): void;
	dispose(): void;
}

type AssertMessageConnectionIsAssignable =
	import("vscode-jsonrpc").MessageConnection extends LspConnection
		? true
		: never;
const assertMessageConnectionIsAssignable: AssertMessageConnectionIsAssignable = true;
void assertMessageConnectionIsAssignable;

export interface LspContentChange {
	range: {
		start: Position;
		end: Position;
	};
	text: string;
}

export interface LspClient {
	initialize(): Promise<void>;
	didOpen(uri: string, text: string, version: number): void;
	didChange(uri: string, version: number, changes: LspContentChange[]): void;
	getIR(uri: string): Promise<GetIRResult>;
	updateConnectionRouting(params: UpdateConnectionRoutingParams): void;
	updateElementPositions(params: UpdateElementPositionsParams): void;
	pinMissingPositions(params: PinMissingPositionsParams): void;
	completion(
		uri: string,
		position: Position,
	): Promise<CompletionList | CompletionItem[] | null>;
	hover(uri: string, position: Position): Promise<Hover | null>;
	definition(
		uri: string,
		position: Position,
	): Promise<Location | Location[] | null>;
	documentSymbols(uri: string): Promise<DocumentSymbol[] | null>;
	formatting(
		uri: string,
		options: FormattingOptions,
	): Promise<TextEdit[] | null>;
	onDiagnostics(
		handler: (uri: string, diagnostics: Diagnostic[]) => void,
	): void;
	onApplyEdit(
		handler: (params: ApplyWorkspaceEditParams) => ApplyWorkspaceEditResult,
	): void;
	onShowMessage(handler: (params: ShowMessageParams) => void): void;
	dispose(): void;
}

export function createLspClient(connection: LspConnection): LspClient {
	connection.listen();

	return {
		async initialize(): Promise<void> {
			await connection.sendRequest("initialize", {
				processId: null,
				rootUri: null,
				capabilities: {},
			});
			connection.sendNotification("initialized", {});
		},
		didOpen(uri, text, version): void {
			connection.sendNotification("textDocument/didOpen", {
				textDocument: {
					uri,
					languageId: "sysdml",
					version,
					text,
				},
			});
		},
		didChange(uri, version, changes): void {
			connection.sendNotification("textDocument/didChange", {
				textDocument: { uri, version },
				contentChanges: changes,
			});
		},
		getIR(uri): Promise<GetIRResult> {
			return connection.sendRequest<GetIRResult>("sysdml/getIR", { uri });
		},
		updateConnectionRouting(params): void {
			connection.sendNotification("sysdml/updateConnectionRouting", params);
		},
		updateElementPositions(params): void {
			connection.sendNotification("sysdml/updateElementPositions", params);
		},
		pinMissingPositions(params): void {
			connection.sendNotification("sysdml/pinMissingPositions", params);
		},
		completion(
			uri,
			position,
		): Promise<CompletionList | CompletionItem[] | null> {
			return connection.sendRequest<CompletionList | CompletionItem[] | null>(
				"textDocument/completion",
				{ textDocument: { uri }, position },
			);
		},
		hover(uri, position): Promise<Hover | null> {
			return connection.sendRequest<Hover | null>("textDocument/hover", {
				textDocument: { uri },
				position,
			});
		},
		definition(uri, position): Promise<Location | Location[] | null> {
			return connection.sendRequest<Location | Location[] | null>(
				"textDocument/definition",
				{ textDocument: { uri }, position },
			);
		},
		documentSymbols(uri): Promise<DocumentSymbol[] | null> {
			return connection.sendRequest<DocumentSymbol[] | null>(
				"textDocument/documentSymbol",
				{ textDocument: { uri } },
			);
		},
		formatting(uri, options): Promise<TextEdit[] | null> {
			return connection.sendRequest<TextEdit[] | null>(
				"textDocument/formatting",
				{ textDocument: { uri }, options },
			);
		},
		onDiagnostics(handler): void {
			connection.onNotification(
				"textDocument/publishDiagnostics",
				(params: PublishDiagnosticsParams) => {
					handler(params.uri, params.diagnostics);
				},
			);
		},
		onApplyEdit(handler): void {
			connection.onRequest("workspace/applyEdit", handler);
		},
		onShowMessage(handler): void {
			connection.onNotification("window/showMessage", handler);
		},
		dispose(): void {
			connection.dispose();
		},
	};
}
