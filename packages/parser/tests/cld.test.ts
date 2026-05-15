import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { describe, test, expect, beforeAll } from "vitest";

import { parseSource } from "../src/index.js";
import type { ConnectionDeclarationNode, DeclarationNode } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
	return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

function isConnection(n: DeclarationNode): n is ConnectionDeclarationNode {
	return n.type === "ConnectionDeclaration";
}

describe("CLD arrow syntax", () => {
	let cldDecls: DeclarationNode[];

	beforeAll(() => {
		const { ast, diagnostics } = parseSource(fixture("simple_cld.sysdml"));
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
		cldDecls = ast!.decls;
	});

	test("parses simple_cld.sysdml with no diagnostics", () => {
		expect(cldDecls).toHaveLength(3);
	});

	test("positive causal arrow ->+", () => {
		const conn = cldDecls.find(
			(d): d is ConnectionDeclarationNode => isConnection(d) && d.polarity === "+",
		);
		expect(conn).toBeDefined();
		expect(conn!.from).toBe("population");
		expect(conn!.to).toBe("births");
	});

	test("negative causal arrow ->-", () => {
		const conn = cldDecls.find(
			(d): d is ConnectionDeclarationNode => isConnection(d) && d.polarity === "-",
		);
		expect(conn).toBeDefined();
		expect(conn!.from).toBe("births");
		expect(conn!.to).toBe("population");
	});

	test("flow connection arrow =>", () => {
		const conn = cldDecls.find(
			(d): d is ConnectionDeclarationNode => isConnection(d) && d.polarity === "=>",
		);
		expect(conn).toBeDefined();
		expect(conn!.from).toBe("births");
		expect(conn!.to).toBe("population");
	});

	test("inline positive causal", () => {
		const { ast, diagnostics } = parseSource(`model m\nA ->+ B`);
		expect(diagnostics).toHaveLength(0);
		const decl = ast!.decls[0];
		expect(isConnection(decl)).toBe(true);
		if (isConnection(decl)) {
			expect(decl.polarity).toBe("+");
			expect(decl.from).toBe("A");
			expect(decl.to).toBe("B");
		}
	});

	test("inline negative causal", () => {
		const { ast, diagnostics } = parseSource(`model m\nA ->- B`);
		expect(diagnostics).toHaveLength(0);
		const decl = ast!.decls[0];
		if (isConnection(decl)) expect(decl.polarity).toBe("-");
	});

	test("inline flow connection", () => {
		const { ast, diagnostics } = parseSource(`model m\nX => Y`);
		expect(diagnostics).toHaveLength(0);
		const decl = ast!.decls[0];
		if (isConnection(decl)) expect(decl.polarity).toBe("=>");
	});

	test("all three polarity types in one model", () => {
		const { ast, diagnostics } = parseSource(
			`model m\nA ->+ B\nB ->- C\nC => D`,
		);
		expect(diagnostics).toHaveLength(0);
		expect(ast!.decls).toHaveLength(3);
		const connections = ast!.decls.filter(isConnection);
		expect(connections).toHaveLength(3);
		expect(connections.map((connection) => connection.polarity)).toEqual([
			"+",
			"-",
			"=>",
		]);
	});
});
