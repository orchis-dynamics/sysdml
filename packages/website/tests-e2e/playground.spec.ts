import { expect, test } from "@playwright/test";

test("playground renders diagram and simulation, and reports diagnostics", async ({
	page,
}) => {
	await page.goto("/");

	const diagram = page.locator("svg").first();
	await expect(diagram).toBeVisible();

	const populationStockNode = page
		.locator("div.border-stone-700")
		.filter({ hasText: /^population$/ });
	await expect(populationStockNode).toBeVisible();

	await populationStockNode.click();
	const plottedLine = page.locator('svg path[class*="linePath"]').first();
	await expect(plottedLine).toBeVisible();

	await page.locator(".monaco-editor").first().click();
	await page.keyboard.type("\nstock ");
	const diagnosticMarker = page.locator(".monaco-editor .squiggly-error");
	await expect(diagnosticMarker.first()).toBeVisible();
});
