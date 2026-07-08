export interface ExampleModel {
	name: string;
	label: string;
	source: string;
}

export const defaultExampleName = "population_growth";

const rawModules = import.meta.glob("../assets/examples/*.sysdml", {
	query: "?raw",
	import: "default",
	eager: true,
});

function fileNameToName(filePath: string): string {
	const base = filePath.split("/").at(-1) ?? filePath;
	return base.replace(/\.sysdml$/, "");
}

function nameToLabel(name: string): string {
	return name
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function toSource(value: unknown): string {
	if (typeof value !== "string") {
		throw new Error("Example model was not imported as raw text");
	}
	return value;
}

export const exampleModels: ExampleModel[] = Object.entries(rawModules)
	.map(([filePath, value]) => {
		const name = fileNameToName(filePath);
		return { name, label: nameToLabel(name), source: toSource(value) };
	})
	.sort((left, right) => left.label.localeCompare(right.label));

export function getDefaultExample(): ExampleModel {
	const found = exampleModels.find(
		(model) => model.name === defaultExampleName,
	);
	if (!found) {
		throw new Error(`Default example "${defaultExampleName}" is not bundled`);
	}
	return found;
}
