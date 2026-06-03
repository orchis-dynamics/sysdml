import * as fs from "fs";
import * as path from "path";

import type { ExtensionToWebviewMessage, IR } from "@sysdml/contracts";
import * as vscode from "vscode";
import { type LanguageClient, State } from "vscode-languageclient/node";

interface GetIRResult {
	ir: IR | null;
}

export class DiagramPanel {
	private static instance: DiagramPanel | undefined;
	private readonly panel: vscode.WebviewPanel;

	private constructor(
		private readonly context: vscode.ExtensionContext,
		panel: vscode.WebviewPanel,
	) {
		this.panel = panel;
		this.panel.onDidDispose(() => {
			DiagramPanel.instance = undefined;
		});
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
		DiagramPanel.instance = new DiagramPanel(context, panel);

		panel.webview.onDidReceiveMessage(async (msg: { type: string }) => {
			if (msg.type === "ready" && DiagramPanel.instance) {
				await DiagramPanel.instance.refresh(client);
			}
		});

		return DiagramPanel.instance;
	}

	async refresh(client: LanguageClient): Promise<void> {
		if (client.state !== State.Running) return;

		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor || activeEditor.document.languageId !== "sysdml") return;

		try {
			const result = await client.sendRequest<GetIRResult>("sysdml/getIR", {
				uri: activeEditor.document.uri.toString(),
			});

			const message: ExtensionToWebviewMessage = result.ir
				? { type: "update", ir: result.ir }
				: { type: "error", message: "No IR available — check for diagnostics" };

			await this.panel.webview.postMessage(message);
		} catch (err) {
			const message: ExtensionToWebviewMessage = {
				type: "error",
				message: String(err),
			};
			await this.panel.webview.postMessage(message);
		}
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
		`img-src ${cspSource} https: data:`,
		`style-src ${cspSource} 'unsafe-inline'`,
		`script-src ${cspSource}`,
		`font-src ${cspSource}`,
		`connect-src ${cspSource}`,
		`worker-src ${cspSource} blob:`,
	].join("; ");
	const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
	html = html.replace(/<head>/i, `<head>\n    ${cspMeta}`);

	return html;
}
