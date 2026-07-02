import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDirectory, "..");
const sourceDirectory = join(packageRoot, "src");
const readmePath = join(packageRoot, "README.md");

const domains = [
	"expression",
	"syntax",
	"diagnostics",
	"model",
	"simulation",
	"protocol",
];

function domainIndexPath(domain) {
	return join(sourceDirectory, domain, "index.ts");
}

function readSourceFile(filePath) {
	return ts.createSourceFile(
		filePath,
		readFileSync(filePath, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
}

function crossDomainDependency(node) {
	const isModuleEdge =
		ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
	if (!isModuleEdge || !node.moduleSpecifier) return null;
	if (!ts.isStringLiteral(node.moduleSpecifier)) return null;
	const match = node.moduleSpecifier.text.match(/^\.\.\/([a-z]+)\/index\.js$/);
	if (!match) return null;
	const dependency = match[1];
	return domains.includes(dependency) ? dependency : null;
}

export function computeDomainDependencyDiagram() {
	const edges = new Set();
	const domainsWithDependencies = new Set();

	for (const domain of domains) {
		readSourceFile(domainIndexPath(domain)).forEachChild((node) => {
			const dependency = crossDomainDependency(node);
			if (!dependency || dependency === domain) return;
			edges.add(`  ${domain} --> ${dependency}`);
			domainsWithDependencies.add(domain);
		});
	}

	const leaves = domains
		.filter((domain) => !domainsWithDependencies.has(domain))
		.map((domain) => `  ${domain}["${domain} — leaf"]`);

	return ["graph TD", ...leaves, ...edges].join("\n");
}

function collectContractTypeNames() {
	const names = new Set();
	for (const domain of domains) {
		readSourceFile(domainIndexPath(domain)).forEachChild((node) => {
			const isTypeDeclaration =
				ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
			if (isTypeDeclaration && node.name) names.add(node.name.text);
		});
	}
	return names;
}

function collectReferencedTypeNames(typeNode, vocabulary, found) {
	if (
		ts.isTypeReferenceNode(typeNode) &&
		ts.isIdentifier(typeNode.typeName) &&
		vocabulary.has(typeNode.typeName.text)
	) {
		found.add(typeNode.typeName.text);
	}
	typeNode.forEachChild((child) =>
		collectReferencedTypeNames(child, vocabulary, found),
	);
}

export function computeModelShapeDiagram() {
	const vocabulary = collectContractTypeNames();
	const modelSource = readSourceFile(domainIndexPath("model"));
	const edges = new Set();

	modelSource.forEachChild((node) => {
		if (!ts.isInterfaceDeclaration(node) || !node.name) return;
		const owner = node.name.text;
		for (const member of node.members) {
			if (!ts.isPropertySignature(member) || !member.type) continue;
			const propertyName = member.name.getText(modelSource);
			const referenced = new Set();
			collectReferencedTypeNames(member.type, vocabulary, referenced);
			for (const target of referenced) {
				if (target === owner) continue;
				edges.add(`  ${owner} -->|${propertyName}| ${target}`);
			}
		}
	});

	return ["graph TD", ...edges].join("\n");
}

function wrapGeneratedBlock(markerName, mermaidSource) {
	return [
		`<!-- generated:${markerName} -->`,
		"```mermaid",
		mermaidSource,
		"```",
		`<!-- /generated:${markerName} -->`,
	].join("\n");
}

function replaceMarkedBlock(readme, markerName, replacement) {
	const pattern = new RegExp(
		`<!-- generated:${markerName} -->[\\s\\S]*?<!-- /generated:${markerName} -->`,
	);
	if (!pattern.test(readme)) {
		throw new Error(`README is missing the generated:${markerName} marker block`);
	}
	return readme.replace(pattern, replacement);
}

export function renderReadme(currentReadme) {
	const withDomainDag = replaceMarkedBlock(
		currentReadme,
		"domain-dag",
		wrapGeneratedBlock("domain-dag", computeDomainDependencyDiagram()),
	);
	return replaceMarkedBlock(
		withDomainDag,
		"model-shape",
		wrapGeneratedBlock("model-shape", computeModelShapeDiagram()),
	);
}

function main() {
	const isCheckMode = process.argv.includes("--check");
	const currentReadme = readFileSync(readmePath, "utf8");
	const renderedReadme = renderReadme(currentReadme);
	const isUpToDate = renderedReadme === currentReadme;

	if (isCheckMode) {
		if (!isUpToDate) {
			console.error(
				"README diagrams are stale. Run: pnpm --filter @sysdml/contracts diagrams",
			);
			process.exit(1);
		}
		console.log("README diagrams are up to date.");
		return;
	}

	if (isUpToDate) {
		console.log("README diagrams already up to date.");
		return;
	}
	writeFileSync(readmePath, renderedReadme);
	console.log("README diagrams regenerated.");
}

const isInvokedDirectly =
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isInvokedDirectly) main();
