import * as path from "path";

import * as vscode from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";

import { DiagramPanel } from "./webview/panel";

let client: LanguageClient | undefined;
let diagramPanel: DiagramPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
	const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.stdio },
		debug: {
			module: serverModule,
			transport: TransportKind.stdio,
			options: { execArgv: ["--nolazy", "--inspect=6009"] },
		},
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: "file", language: "sysdml" }],
		synchronize: {
			fileEvents: vscode.workspace.createFileSystemWatcher("**/*.sysdml"),
		},
	};

	client = new LanguageClient(
		"sysdml",
		"SysDML Language Server",
		serverOptions,
		clientOptions,
	);

	void client.start().then(() => {
		if (diagramPanel && !diagramPanel.isDisposed && client) {
			void diagramPanel.refresh(client);
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand("sysdml.openDiagram", () => {
			if (!client) return;
			const panel = DiagramPanel.createOrShow(context, client);
			if (panel === diagramPanel) return;
			diagramPanel = panel;
			panel.onDidDispose(() => {
				if (diagramPanel === panel) diagramPanel = undefined;
			});
		}),
		vscode.commands.registerCommand("sysdml.refreshDiagram", async () => {
			if (!client || !diagramPanel || diagramPanel.isDisposed) return;
			await diagramPanel.refresh(client);
		}),
		vscode.workspace.onDidSaveTextDocument(async (doc) => {
			if (doc.languageId !== "sysdml") return;
			if (!client || !diagramPanel || diagramPanel.isDisposed) return;
			await diagramPanel.refresh(client);
		}),
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (!editor || editor.document.languageId !== "sysdml") return;
			if (!client || !diagramPanel || diagramPanel.isDisposed) return;
			await diagramPanel.refresh(client);
		}),
	);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) return undefined;
	return client.stop();
}
