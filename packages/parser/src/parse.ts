import {
	ATNSimulator,
	BaseErrorListener,
	CharStream,
	CommonTokenStream,
	RecognitionException,
	Recognizer,
	Token,
} from "antlr4ng";

import { SYSDMLLexer } from "../generated/SYSDMLLexer.js";
import { SYSDMLParser } from "../generated/SYSDMLParser.js";
import { ASTBuilder } from "./ast/ASTBuilder.js";
import type { Diagnostic, FileNode, Span } from "./ast/types.js";

export type { Span, Diagnostic };
export type { ASTNode, FileNode } from "./ast/types.js";

export interface ParseResult {
	ast: FileNode | null;
	diagnostics: Diagnostic[];
}

class CollectingErrorListener extends BaseErrorListener {
	readonly diagnostics: Diagnostic[] = [];

	override syntaxError<T extends ATNSimulator>(
		_recognizer: Recognizer<T>,
		_offendingSymbol: Token | null,
		line: number,
		charPositionInLine: number,
		msg: string,
		_e: RecognitionException | null,
	): void {
		// ANTLR gives charPositionInLine as 0-based; spans are 1-based.
		const col = charPositionInLine + 1;
		this.diagnostics.push({
			message: msg,
			span: {
				start: { line, col },
				end: { line, col },
			},
		});
	}
}

export function parseSource(source: string): ParseResult {
	const inputStream = CharStream.fromString(source);
	const lexer = new SYSDMLLexer(inputStream);
	const tokenStream = new CommonTokenStream(lexer);
	const parser = new SYSDMLParser(tokenStream);

	const errorListener = new CollectingErrorListener();

	lexer.removeErrorListeners();
	lexer.addErrorListener(errorListener);
	parser.removeErrorListeners();
	parser.addErrorListener(errorListener);

	const tree = parser.file();

	if (errorListener.diagnostics.length > 0) {
		return { ast: null, diagnostics: errorListener.diagnostics };
	}

	try {
		const builder = new ASTBuilder();
		const { ast, diagnostics: builderDiagnostics } = builder.build(tree);
		return {
			ast: builderDiagnostics.length > 0 ? null : ast,
			diagnostics: builderDiagnostics,
		};
	} catch (err) {
		// Invariant assertion in the builder fired — the parse tree had a shape
		// the builder doesn't recognise. This indicates a parser bug, not bad input.
		// Use (1,1) as a sentinel since (0,0) is invalid under the 1-based scheme.
		return {
			ast: null,
			diagnostics: [
				{
					message: err instanceof Error ? err.message : String(err),
					span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } },
				},
			],
		};
	}
}
