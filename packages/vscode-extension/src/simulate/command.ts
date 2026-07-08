import { runPipeline } from "@sysdml/cli/pipeline";
import * as vscode from "vscode";

import { outcomeFromPipeline } from "./outcome";

export async function runSimulateCommand(): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.languageId !== "sysdml") {
		void vscode.window.showInformationMessage(
			"Open a .sysdml file to simulate",
		);
		return;
	}
	try {
		const outcome = outcomeFromPipeline(
			await runPipeline(editor.document.getText()),
		);
		if (outcome.kind === "error") {
			void vscode.window.showErrorMessage(outcome.message);
			return;
		}
		if (outcome.warnings.length > 0) {
			void vscode.window.showWarningMessage(outcome.warnings.join(" | "));
		}
		const document = await vscode.workspace.openTextDocument({
			language: "csv",
			content: outcome.csv,
		});
		await vscode.window.showTextDocument(document, {
			viewColumn: vscode.ViewColumn.Beside,
			preview: false,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		void vscode.window.showErrorMessage(`Simulation failed: ${message}`);
	}
}
