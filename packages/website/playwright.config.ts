import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests-e2e",
	timeout: 60_000,
	expect: { timeout: 15_000 },
	use: {
		baseURL: "http://localhost:3000",
	},
	webServer: {
		command: "pnpm run generate && pnpm run preview",
		url: "http://localhost:3000",
		timeout: 180_000,
		reuseExistingServer: false,
	},
});
