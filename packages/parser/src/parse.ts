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
import type { FileContext } from "../generated/SYSDMLParser.js";
import { ASTBuilder } from "./ast/ASTBuilder.js";
import type { Diagnostic, ParseResult } from "@sysdml/contracts";

function offendingTokenWidth(offendingSymbol: Token | null): number {
	if (offendingSymbol === null || offendingSymbol.type === Token.EOF) return 1;
	const text = offendingSymbol.text;
	if (text === undefined || text.length === 0) return 1;
	return text.length;
}

class CollectingErrorListener extends BaseErrorListener {
	readonly diagnostics: Diagnostic[] = [];

	override syntaxError<T extends ATNSimulator>(
		_recognizer: Recognizer<T>,
		offendingSymbol: Token | null,
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
				end: {
					line,
					col: charPositionInLine + offendingTokenWidth(offendingSymbol),
				},
			},
		});
	}
}

function runParser(
	source: string,
	errorListener: CollectingErrorListener,
): FileContext {
	const inputStream = CharStream.fromString(source);
	const lexer = new SYSDMLLexer(inputStream);
	const tokenStream = new CommonTokenStream(lexer);
	const parser = new SYSDMLParser(tokenStream);

	lexer.removeErrorListeners();
	lexer.addErrorListener(errorListener);
	parser.removeErrorListeners();
	parser.addErrorListener(errorListener);

	return parser.file();
}

function internalErrorDiagnostic(thrown: unknown): Diagnostic {
	const message =
		thrown instanceof RangeError
			? "expression nesting too deep for the parser"
			: thrown instanceof Error
				? thrown.message
				: String(thrown);
	// Use (1,1) as a sentinel since (0,0) is invalid under the 1-based scheme.
	return {
		message,
		span: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } },
	};
}

export function parseSource(source: string): ParseResult {
	try {
		const errorListener = new CollectingErrorListener();
		const tree = runParser(source, errorListener);

		if (errorListener.diagnostics.length > 0) {
			return { ast: null, diagnostics: errorListener.diagnostics };
		}

		const builder = new ASTBuilder();
		const { ast, diagnostics: builderDiagnostics } = builder.build(tree);
		return {
			ast: builderDiagnostics.length > 0 ? null : ast,
			diagnostics: builderDiagnostics,
		};
	} catch (thrown) {
		return { ast: null, diagnostics: [internalErrorDiagnostic(thrown)] };
	}
}
