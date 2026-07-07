import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { describe, test, it, expect, beforeAll } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	ConnectionDeclarationNode,
	DeclarationNode,
} from "../src/index.js";

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
			(d): d is ConnectionDeclarationNode =>
				isConnection(d) && d.polarity === "+",
		);
		expect(conn).toBeDefined();
		expect(conn!.from).toBe("population");
		expect(conn!.to).toBe("births");
	});

	test("negative causal arrow ->-", () => {
		const conn = cldDecls.find(
			(d): d is ConnectionDeclarationNode =>
				isConnection(d) && d.polarity === "-",
		);
		expect(conn).toBeDefined();
		expect(conn!.from).toBe("births");
		expect(conn!.to).toBe("population");
	});

	test("flow connection arrow =>", () => {
		const conn = cldDecls.find(
			(d): d is ConnectionDeclarationNode =>
				isConnection(d) && d.polarity === "=>",
		);
		expect(conn).toBeDefined();
		expect(conn!.from).toBe("births");
		expect(conn!.to).toBe("population");
	});

	test("inline positive causal", () => {
		const { ast, diagnostics } = parseSource(`sfd m\nA ->+ B`);
		expect(diagnostics).toHaveLength(0);
		const decl = ast!.decls[0];
		if (decl === undefined) throw new Error("expected a declaration");
		expect(isConnection(decl)).toBe(true);
		if (isConnection(decl)) {
			expect(decl.polarity).toBe("+");
			expect(decl.from).toBe("A");
			expect(decl.to).toBe("B");
		}
	});

	test("inline negative causal", () => {
		const { ast, diagnostics } = parseSource(`sfd m\nA ->- B`);
		expect(diagnostics).toHaveLength(0);
		const decl = ast!.decls[0];
		if (decl === undefined) throw new Error("expected a declaration");
		if (isConnection(decl)) expect(decl.polarity).toBe("-");
	});

	test("inline flow connection", () => {
		const { ast, diagnostics } = parseSource(`sfd m\nX => Y`);
		expect(diagnostics).toHaveLength(0);
		const decl = ast!.decls[0];
		if (decl === undefined) throw new Error("expected a declaration");
		if (isConnection(decl)) expect(decl.polarity).toBe("=>");
	});

	test("all three polarity types in one model", () => {
		const { ast, diagnostics } = parseSource(`sfd m\nA ->+ B\nB ->- C\nC => D`);
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

describe("model declaration keywords", () => {
	test("accepts `sfd` keyword", () => {
		const { ast, diagnostics } = parseSource(`sfd m\nA ->+ B`);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("m");
	});

	test("accepts `cld` keyword", () => {
		const { ast, diagnostics } = parseSource(`cld m\nA ->+ B`);
		expect(diagnostics).toHaveLength(0);
		expect(ast).not.toBeNull();
		expect(ast!.model.id).toBe("m");
	});

	test("ModelDeclarationNode carries kind = 'cld' for cld keyword", () => {
		const { ast } = parseSource(`cld m\nA ->+ B`);
		expect(ast!.model.kind).toBe("cld");
	});

	test("ModelDeclarationNode carries kind = 'sfd' for sfd keyword", () => {
		const { ast } = parseSource(`sfd m\nA ->+ B`);
		expect(ast!.model.kind).toBe("sfd");
	});

	test("`model` keyword is no longer accepted", () => {
		const { ast, diagnostics } = parseSource(`model m\nA ->+ B`);
		expect(diagnostics.length).toBeGreaterThan(0);
		expect(ast).toBeNull();
	});
});

describe("expression-less aux", () => {
	it("parses an aux with only a position block", () => {
		const { ast, diagnostics } = parseSource(
			`cld m\naux population { position: { x: 120, y: 40 } }\npopulation ->+ births`,
		);
		expect(diagnostics).toEqual([]);
		const aux = ast!.decls.find((d) => d.type === "AuxiliaryDeclaration");
		expect(aux).toMatchObject({
			id: "population",
			expr: undefined,
			position: { x: 120, y: 40 },
		});
	});

	it("rejects a bare aux with neither expression nor block", () => {
		const { diagnostics } = parseSource(`cld m\naux population`);
		expect(diagnostics.length).toBeGreaterThan(0);
	});
});
