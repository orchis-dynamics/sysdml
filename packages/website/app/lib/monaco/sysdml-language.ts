import {
	CONSTANT_KEYWORDS,
	LOGICAL_OPERATOR_KEYWORDS,
	PROPERTY_KEYWORDS,
	TOP_LEVEL_KEYWORDS,
} from "@sysdml/contracts";
import type * as monaco from "monaco-editor";

export const SYSDML_LANGUAGE_ID = "sysdml";

export interface MonacoLanguageRegistrar {
	languages: {
		register(language: { id: string }): void;
		setMonarchTokensProvider(
			languageId: string,
			provider: monaco.languages.IMonarchLanguage,
		): void;
		setLanguageConfiguration(
			languageId: string,
			configuration: monaco.languages.LanguageConfiguration,
		): void;
		getLanguages(): { id: string }[];
	};
}

type AssertRealMonacoIsAssignable =
	typeof import("monaco-editor") extends MonacoLanguageRegistrar ? true : never;
const assertRealMonacoIsAssignable: AssertRealMonacoIsAssignable = true;
void assertRealMonacoIsAssignable;

export const sysdmlMonarchLanguage: monaco.languages.IMonarchLanguage = {
	defaultToken: "",
	keywords: [...TOP_LEVEL_KEYWORDS],
	operatorWords: [...LOGICAL_OPERATOR_KEYWORDS],
	properties: [...PROPERTY_KEYWORDS],
	constants: [...CONSTANT_KEYWORDS],
	tokenizer: {
		root: [
			[/\/\/.*$/, "comment"],
			[/#.*$/, "comment"],
			[/\/\*/, "comment", "@blockComment"],
			[/->\+|->-|=>/, "operator"],
			[/<=|>=|<>|==|!=|<|>|=|!/, "operator"],
			[/&&|\|\||[+\-*/^]/, "operator"],
			[/\b\d+(?:\.\d*)?\b|\.\d+/, "number"],
			[
				/[a-zA-Z_][a-zA-Z0-9_]*/,
				{
					cases: {
						"@keywords": "keyword",
						"@operatorWords": "keyword",
						"@properties": "type",
						"@constants": "constant",
						"@default": "identifier",
					},
				},
			],
			[/[{}()[\]]/, "@brackets"],
		],
		blockComment: [
			[/[^/*]+/, "comment"],
			[/\*\//, "comment", "@pop"],
			[/[/*]/, "comment"],
		],
	},
};

export const sysdmlLanguageConfiguration: monaco.languages.LanguageConfiguration =
	{
		comments: {
			lineComment: "//",
			blockComment: ["/*", "*/"],
		},
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
		],
	};

export function registerSysdmlLanguage(
	monacoApi: MonacoLanguageRegistrar,
): void {
	const alreadyRegistered = monacoApi.languages
		.getLanguages()
		.some((language) => language.id === SYSDML_LANGUAGE_ID);
	if (alreadyRegistered) return;
	monacoApi.languages.register({ id: SYSDML_LANGUAGE_ID });
	monacoApi.languages.setMonarchTokensProvider(
		SYSDML_LANGUAGE_ID,
		sysdmlMonarchLanguage,
	);
	monacoApi.languages.setLanguageConfiguration(
		SYSDML_LANGUAGE_ID,
		sysdmlLanguageConfiguration,
	);
}
