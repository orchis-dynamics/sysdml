import * as fs from "fs";
import * as path from "path";

import type {
	ExtensionToWebviewMessage,
	GetIRParams,
	GetIRResult,
	WebviewToExtensionMessage,
} from "@sysdml/contracts";
import * as vscode from "vscode";
import { type LanguageClient, State } from "vscode-languageclient/node";

export class DiagramPanel {
	private static instance: DiagramPanel | undefined;
	private readonly panel: vscode.WebviewPanel;
	private hasBeenDisposed = false;
	private readonly disposeListeners: Array<() => void> = [];

	private constructor(panel: vscode.WebviewPanel) {
		this.panel = panel;
		this.panel.onDidDispose(() => {
			this.hasBeenDisposed = true;
			DiagramPanel.instance = undefined;
			for (const listener of this.disposeListeners) listener();
		});
	}

	get isDisposed(): boolean {
		return this.hasBeenDisposed;
	}

	onDidDispose(listener: () => void): void {
		if (this.hasBeenDisposed) {
			listener();
			return;
		}
		this.disposeListeners.push(listener);
	}

	static createOrShow(
		context: vscode.ExtensionContext,
		client: LanguageClient,
	): DiagramPanel {
		if (DiagramPanel.instance) {
			DiagramPanel.instance.panel.reveal(vscode.ViewColumn.Beside, true);
			void DiagramPanel.instance.refresh(client);
			return DiagramPanel.instance;
		}

		const rendererDistPath = vscode.Uri.file(
			path.join(context.extensionPath, "renderer-dist"),
		);

		const panel = vscode.window.createWebviewPanel(
			"sysdmlDiagram",
			"SysDML Diagram",
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
			{
				enableScripts: true,
				localResourceRoots: [rendererDistPath],
				retainContextWhenHidden: true,
			},
		);

		panel.webview.html = buildWebViewHtml(panel.webview, rendererDistPath);
		const diagramPanel = new DiagramPanel(panel);
		DiagramPanel.instance = diagramPanel;

		panel.webview.onDidReceiveMessage(
			async (message: WebviewToExtensionMessage) => {
				if (message.type === "ready") {
					await diagramPanel.refresh(client);
				}
			},
		);

		return diagramPanel;
	}

	async refresh(client: LanguageClient): Promise<void> {
		if (this.hasBeenDisposed) return;
		if (client.state !== State.Running) return;

		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor || activeEditor.document.languageId !== "sysdml") return;

		const params: GetIRParams = {
			uri: activeEditor.document.uri.toString(),
		};

		try {
			const result = await client.sendRequest<GetIRResult>(
				"sysdml/getIR",
				params,
			);
			const message: ExtensionToWebviewMessage = result.ir
				? { type: "update", ir: result.ir }
				: { type: "error", message: "No IR available — check for diagnostics" };
			await this.postMessageIfAlive(message);
		} catch (error) {
			await this.postMessageIfAlive({
				type: "error",
				message: String(error),
			});
		}
	}

	private async postMessageIfAlive(
		message: ExtensionToWebviewMessage,
	): Promise<void> {
		if (this.hasBeenDisposed) return;
		await this.panel.webview.postMessage(message);
	}
}

function buildWebViewHtml(
	webview: vscode.Webview,
	rendererDistPath: vscode.Uri,
): string {
	const indexPath = vscode.Uri.joinPath(rendererDistPath, "index.html").fsPath;
	let html = fs.readFileSync(indexPath, "utf-8");

	html = html.replace(/\.?\/(assets\/[^"']+)/g, (_, assetPath: string) => {
		return webview
			.asWebviewUri(vscode.Uri.joinPath(rendererDistPath, assetPath))
			.toString();
	});

	html = html.replace(/ crossorigin/g, "");

	const cspSource = webview.cspSource;
	const csp = [
		"default-src 'none'",
		`img-src ${cspSource} data:`,
		`style-src ${cspSource} 'unsafe-inline'`,
		`script-src ${cspSource} 'wasm-unsafe-eval'`,
		`font-src ${cspSource}`,
		`connect-src ${cspSource}`,
		`worker-src ${cspSource} blob:`,
	].join("; ");
	const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
	html = html.replace(/<head>/i, `<head>\n    ${cspMeta}`);

	return html;
}
