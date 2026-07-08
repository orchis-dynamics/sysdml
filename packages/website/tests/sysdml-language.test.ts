import { describe, expect, test, vi } from "vitest";

import {
	SYSDML_LANGUAGE_ID,
	sysdmlMonarchLanguage,
	registerSysdmlLanguage,
} from "../app/lib/monaco/sysdml-language";

describe("sysdml-language", () => {
	test("keyword lists mirror the grammar", () => {
		expect(sysdmlMonarchLanguage.keywords).toEqual(
			expect.arrayContaining([
				"sfd",
				"cld",
				"stock",
				"aux",
				"flow",
				"time",
				"gf",
			]),
		);
		expect(sysdmlMonarchLanguage.properties).toEqual(
			expect.arrayContaining(["from", "to", "rate", "init", "angle", "via"]),
		);
	});

	test("registers the language exactly once", () => {
		const register = vi.fn();
		const setMonarchTokensProvider = vi.fn();
		const setLanguageConfiguration = vi.fn();
		const getLanguages = vi.fn((): { id: string }[] => []);
		const monacoApi = {
			languages: {
				register,
				setMonarchTokensProvider,
				setLanguageConfiguration,
				getLanguages,
			},
		};

		registerSysdmlLanguage(monacoApi);
		expect(register).toHaveBeenCalledWith({ id: SYSDML_LANGUAGE_ID });

		getLanguages.mockReturnValue([{ id: SYSDML_LANGUAGE_ID }]);
		registerSysdmlLanguage(monacoApi);
		expect(register).toHaveBeenCalledTimes(1);
	});
});
