import { describe, test, expect } from "vitest";
import { parseSource } from "../src/index.js";
import type {
	AuxiliaryDeclarationNode,
	ConnectionDeclarationNode,
	FlowDeclarationNode,
	PositionNode,
	StockDeclarationNode,
} from "../src/index.js";

function stock(src: string): StockDeclarationNode {
	const { ast, diagnostics } = parseSource(`model m\n${src}`);
	if (!ast) throw new Error(`Parse failed: ${diagnostics[0]?.message}`);
	const decl = ast.decls.find((d) => d.type === "StockDeclaration");
	if (!decl || decl.type !== "StockDeclaration") throw new Error("No StockDeclaration found");
	return decl;
}

function flow(src: string): FlowDeclarationNode {
	const { ast, diagnostics } = parseSource(`model m\n${src}`);
	if (!ast) throw new Error(`Parse failed: ${diagnostics[0]?.message}`);
	const decl = ast.decls.find((d) => d.type === "FlowDeclaration");
	if (!decl || decl.type !== "FlowDeclaration") throw new Error("No FlowDeclaration found");
	return decl;
}

function aux(src: string): AuxiliaryDeclarationNode {
	const { ast, diagnostics } = parseSource(`model m\n${src}`);
	if (!ast) throw new Error(`Parse failed: ${diagnostics[0]?.message}`);
	const decl = ast.decls.find((d) => d.type === "AuxiliaryDeclaration");
	if (!decl || decl.type !== "AuxiliaryDeclaration") throw new Error("No AuxiliaryDeclaration found");
	return decl;
}

function connection(src: string): ConnectionDeclarationNode {
	const { ast, diagnostics } = parseSource(`model m\n${src}`);
	if (!ast) throw new Error(`Parse failed: ${diagnostics[0]?.message}`);
	const decl = ast.decls.find((d) => d.type === "ConnectionDeclaration");
	if (!decl || decl.type !== "ConnectionDeclaration") throw new Error("No ConnectionDeclaration found");
	return decl;
}

function posEq(pos: PositionNode | undefined, x: number, y: number): void {
	expect(pos).not.toBeUndefined();
	expect(pos!.type).toBe("Position");
	expect(pos!.x).toBe(x);
	expect(pos!.y).toBe(y);
}

describe("layout — stock", () => {
	test("stock with position parses correctly", () => {
		const s = stock("stock population { init: 100\n position: { x: 400, y: 300 } }");
		posEq(s.position, 400, 300);
	});

	test("stock without position has undefined position", () => {
		const s = stock("stock population { init: 100 }");
		expect(s.position).toBeUndefined();
	});

	test("stock position supports negative coordinates", () => {
		const s = stock("stock s { init: 0\n position: { x: -100, y: -200 } }");
		posEq(s.position, -100, -200);
	});
});

describe("layout — flow", () => {
	test("flow with position parses correctly", () => {
		const f = flow(
			"flow births { from: null\n to: population\n rate: 0.02\n position: { x: 200, y: 300 } }",
		);
		posEq(f.position, 200, 300);
		expect(f.via).toBeUndefined();
	});

	test("flow with via parses correctly", () => {
		const f = flow(
			"flow births { from: null\n to: population\n rate: 0.02\n via: [{ x: 150, y: 150 }, { x: 180, y: 250 }] }",
		);
		expect(f.via).toHaveLength(2);
		posEq(f.via![0], 150, 150);
		posEq(f.via![1], 180, 250);
	});

	test("flow with position and via parses correctly", () => {
		const f = flow(
			"flow births { from: null\n to: population\n rate: 0.02\n position: { x: 200, y: 300 }\n via: [{ x: 150, y: 100 }] }",
		);
		posEq(f.position, 200, 300);
		expect(f.via).toHaveLength(1);
		posEq(f.via![0], 150, 100);
	});

	test("flow without layout has no position or via", () => {
		const f = flow("flow births { from: null\n to: population\n rate: 0.02 }");
		expect(f.position).toBeUndefined();
		expect(f.via).toBeUndefined();
	});
});

describe("layout — aux", () => {
	test("aux with metadata block carries position", () => {
		const a = aux("aux birth_rate = 0.02 { position: { x: 200, y: 300 } }");
		posEq(a.position, 200, 300);
	});

	test("aux without metadata block has undefined position", () => {
		const a = aux("aux birth_rate = 0.02");
		expect(a.position).toBeUndefined();
	});
});

describe("layout — connection", () => {
	test("connection with angle parses correctly", () => {
		const c = connection("birth_rate ->+ population { angle: 45 }");
		expect(c.angle).toBe(45);
		expect(c.via).toBeUndefined();
	});

	test("connection with negative angle parses correctly", () => {
		const c = connection("birth_rate ->+ population { angle: -90 }");
		expect(c.angle).toBe(-90);
	});

	test("connection with angle and via parses correctly", () => {
		const c = connection("birth_rate ->+ population { angle: -30\n via: { x: 150, y: 80 } }");
		expect(c.angle).toBe(-30);
		posEq(c.via, 150, 80);
	});

	test("connection without block has no angle or via", () => {
		const c = connection("birth_rate ->+ population");
		expect(c.angle).toBeUndefined();
		expect(c.via).toBeUndefined();
	});

	test("negative causal connection with angle parses correctly", () => {
		const c = connection("crowding ->- birth_rate { angle: 60 }");
		expect(c.polarity).toBe("-");
		expect(c.angle).toBe(60);
	});

	test("flow connection with angle parses correctly", () => {
		const c = connection("births => population { angle: 20 }");
		expect(c.polarity).toBe("=>");
		expect(c.angle).toBe(20);
	});
});
