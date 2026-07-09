module.exports = {
	compilationOptions: {
		preferredConfigPath: "./tsconfig.json",
	},
	entries: [
		{
			filePath: "./src/index.ts",
			outFile: "./dist/index.d.ts",
			noCheck: false,
			libraries: {
				inlinedLibraries: ["@simlin/engine"],
			},
			output: {
				noBanner: true,
			},
		},
	],
};
