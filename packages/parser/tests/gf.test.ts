import { describe, test, expect } from "vitest";

import { parseSource } from "../src/index.js";
import type {
	AuxiliaryDeclarationNode,
	GraphicalFunctionDeclarationNode,
	GraphicalFunctionBodyNode,
	NumberListNode,
} from "../src/index.js";

function parseOk(src: string) {
	const result = parseSource(src);
	expect(
		result.diagnostics,
		result.diagnostics.map((diagnostic) => diagnostic.message).join(", "),
	).toHaveLength(0);
	if (result.ast === null) throw new Error("expected non-null ast");
	return result.ast;
}

function wrap(body: string) {
	return `model m\ntime { start: 0 end: 1 step: 1 }\nstock s { init: 0 }\n${body}`;
}

function parseGraphicalFunctionDeclaration(src: string): GraphicalFunctionDeclarationNode {
	const ast = parseOk(wrap(src));
	const declaration = ast.decls.find(
		(decl) => decl.type === "GraphicalFunctionDeclaration",
	) as GraphicalFunctionDeclarationNode;
	expect(declaration).toBeDefined();
	return declaration;
}

function numListValues(body: GraphicalFunctionBodyNode, key: string): number[] {
	const prop = body.props.find((property) => property.key === key);
	if (prop === undefined) throw new Error(`expected prop '${key}'`);
	const list = prop.value as NumberListNode;
	return list.values.map(
		(signedNumber) =>
			(signedNumber.negative ? -1 : 1) * parseFloat(signedNumber.lit.value),
	);
}

describe("named gf — xscale form", () => {
	test("parses id correctly", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf my_curve { xscale: [0, 1] ypts: [0, 0.5, 1] }",
		);
		expect(declaration.id).toBe("my_curve");
	});
	test("xscale values", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }",
		);
		expect(numListValues(declaration.body, "xscale")).toEqual([0, 1]);
	});
	test("ypts values", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [0, 0.5, 1] }",
		);
		expect(numListValues(declaration.body, "ypts")).toEqual([0, 0.5, 1]);
	});
});

describe("named gf — xpts form", () => {
	test("xpts values", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xpts: [0, 0.25, 0.5, 0.75, 1] ypts: [0, 0.1, 0.5, 0.9, 1] }",
		);
		expect(numListValues(declaration.body, "xpts")).toEqual([
			0, 0.25, 0.5, 0.75, 1,
		]);
	});
	test("ypts values match count", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xpts: [0, 0.25, 0.5, 0.75, 1] ypts: [0, 0.1, 0.5, 0.9, 1] }",
		);
		expect(numListValues(declaration.body, "ypts")).toHaveLength(5);
	});
});

describe("named gf — kind prop", () => {
	test("kind: linear", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { kind: linear xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(
			declaration.body.props.find((property) => property.key === "kind")?.value,
		).toBe("linear");
	});
	test("kind: extra", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { kind: extra xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(
			declaration.body.props.find((property) => property.key === "kind")?.value,
		).toBe("extra");
	});
	test("kind: step", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { kind: step xscale: [0, 1] ypts: [0, 1, 1] }",
		);
		expect(
			declaration.body.props.find((property) => property.key === "kind")?.value,
		).toBe("step");
	});
	test("no kind prop when omitted", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(
			declaration.body.props.find((property) => property.key === "kind"),
		).toBeUndefined();
	});
});

describe("named gf — yscale prop", () => {
	test("yscale values stored", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [0, 0.5, 1] yscale: [0, 1] }",
		);
		expect(numListValues(declaration.body, "yscale")).toEqual([0, 1]);
	});
});

describe("named gf — negative and decimal values", () => {
	test("negative xscale", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [-10, 10] ypts: [0, 0.5, 1] }",
		);
		expect(numListValues(declaration.body, "xscale")).toEqual([-10, 10]);
	});
	test("negative ypts", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [-1, 0, 1] }",
		);
		expect(numListValues(declaration.body, "ypts")).toEqual([-1, 0, 1]);
	});
	test("decimal xpts", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xpts: [0.1, 0.5, 0.9] ypts: [0, 0.5, 1] }",
		);
		expect(numListValues(declaration.body, "xpts")).toEqual([0.1, 0.5, 0.9]);
	});
	test("two-point minimum", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [0, 1] }",
		);
		expect(numListValues(declaration.body, "ypts")).toHaveLength(2);
	});
	test("many ypts", () => {
		const declaration = parseGraphicalFunctionDeclaration(
			"gf f { xscale: [0, 1] ypts: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }",
		);
		expect(numListValues(declaration.body, "ypts")).toHaveLength(11);
	});
});

describe("named gf — multiple in same model", () => {
	test("two gf declarations both parsed", () => {
		const ast = parseOk(
			wrap(
				"gf f1 { xscale: [0, 1] ypts: [0, 1] }\ngf f2 { xscale: [0, 10] ypts: [0, 0.5, 1] }",
			),
		);
		const graphicalFunctionDeclarations = ast.decls.filter(
			(declaration) => declaration.type === "GraphicalFunctionDeclaration",
		) as GraphicalFunctionDeclarationNode[];
		expect(graphicalFunctionDeclarations).toHaveLength(2);
		const [firstDeclaration, secondDeclaration] = graphicalFunctionDeclarations;
		if (firstDeclaration === undefined || secondDeclaration === undefined) {
			throw new Error("expected two gf declarations");
		}
		expect(firstDeclaration.id).toBe("f1");
		expect(secondDeclaration.id).toBe("f2");
	});
});

describe("named gf referenced in aux expression", () => {
	test("gf call parses as FunctionCall", () => {
		const ast = parseOk(
			wrap("gf f { xscale: [0, 1] ypts: [0, 1] }\naux result = f(s)"),
		);
		const aux = ast.decls.find(
			(declaration) => declaration.type === "AuxiliaryDeclaration",
		) as AuxiliaryDeclarationNode;
		expect(aux.expr.type).toBe("FunctionCall");
	});
});

describe("aux with inline gf via named decl", () => {
	test("aux references a named gf with linear kind (default)", () => {
		const { ast, diagnostics } = parseSource(
			"model m\ngf food_curve { xscale: [0, 1] ypts: [0, 0.5, 1] }\naux food_effect = food_curve(s)",
		);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected ast");
		const aux = ast.decls.find((d) => d.type === "AuxiliaryDeclaration");
		if (aux?.type !== "AuxiliaryDeclaration") throw new Error("expected AuxiliaryDeclaration");
		expect(aux.expr.type).toBe("FunctionCall");
	});

	test("aux references a named gf with kind: step", () => {
		const { ast, diagnostics } = parseSource(
			"model m\ngf effect_curve { kind: step xscale: [0, 1] ypts: [0, 1, 1] }\naux effect = effect_curve(s)",
		);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected ast");
		const gf = ast.decls.find((d) => d.type === "GraphicalFunctionDeclaration");
		if (gf?.type !== "GraphicalFunctionDeclaration") throw new Error("expected GraphicalFunctionDeclaration");
		const kindProp = gf.body.props.find((p) => p.key === "kind");
		expect(kindProp).toBeDefined();
		if (kindProp?.key === "kind") expect(kindProp.value).toBe("step");
	});

	test("aux references a named gf with yscale", () => {
		const { ast, diagnostics } = parseSource(
			"model m\ngf effect_curve { xscale: [0, 1] ypts: [0, 1] yscale: [0, 1] }\naux effect = effect_curve(s)",
		);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected ast");
		const gf = ast.decls.find((d) => d.type === "GraphicalFunctionDeclaration");
		if (gf?.type !== "GraphicalFunctionDeclaration") throw new Error("expected GraphicalFunctionDeclaration");
		const yscaleProp = gf.body.props.find((p) => p.key === "yscale");
		expect(yscaleProp).toBeDefined();
	});

	test("aux references a named gf with xpts form", () => {
		const { ast, diagnostics } = parseSource(
			"model m\ngf effect_curve { xpts: [0, 0.5, 1] ypts: [0, 0.5, 1] }\naux effect = effect_curve(s)",
		);
		expect(diagnostics).toHaveLength(0);
		if (ast === null) throw new Error("expected ast");
		const gf = ast.decls.find((d) => d.type === "GraphicalFunctionDeclaration");
		if (gf?.type !== "GraphicalFunctionDeclaration") throw new Error("expected GraphicalFunctionDeclaration");
		const xptsProp = gf.body.props.find((p) => p.key === "xpts");
		expect(xptsProp).toBeDefined();
	});
});

describe("lookup() inline function", () => {
	test("parses as FunctionCall named lookup", () => {
		const ast = parseOk(wrap("aux result = lookup(s, 0, 0.5, 1)"));
		const aux = ast.decls.find(
			(declaration) => declaration.type === "AuxiliaryDeclaration",
		) as AuxiliaryDeclarationNode;
		expect(aux.expr.type).toBe("FunctionCall");
		if (aux.expr.type === "FunctionCall") expect(aux.expr.name).toBe("lookup");
	});
	test("first arg is input expression", () => {
		const ast = parseOk(wrap("aux result = lookup(s, 0, 0.5, 1)"));
		const aux = ast.decls.find(
			(declaration) => declaration.type === "AuxiliaryDeclaration",
		) as AuxiliaryDeclarationNode;
		if (aux.expr.type === "FunctionCall") {
			const firstArg = aux.expr.args[0];
			if (firstArg === undefined) throw new Error("expected first arg");
			expect(firstArg.type).toBe("IdentifierReference");
		}
	});
	test("four total args (input + 3 ypts)", () => {
		const ast = parseOk(wrap("aux result = lookup(s, 0, 0.5, 1)"));
		const aux = ast.decls.find(
			(declaration) => declaration.type === "AuxiliaryDeclaration",
		) as AuxiliaryDeclarationNode;
		if (aux.expr.type === "FunctionCall") expect(aux.expr.args).toHaveLength(4);
	});
	test("many y-points", () => {
		const ast = parseOk(
			wrap(
				"aux result = lookup(s, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1)",
			),
		);
		const aux = ast.decls.find(
			(declaration) => declaration.type === "AuxiliaryDeclaration",
		) as AuxiliaryDeclarationNode;
		if (aux.expr.type === "FunctionCall") expect(aux.expr.args).toHaveLength(12);
	});
	test("lookup in flow rate", () => {
		const ast = parseOk(
			"model m\ntime { start: 0 end: 1 step: 1 }\nstock pop { init: 100 }\nflow growth {\n  from: null\n  to: pop\n  rate: lookup(pop, 0, 0.5, 1)\n}",
		);
		expect(
			ast.decls.some((declaration) => declaration.type === "FlowDeclaration"),
		).toBe(true);
	});
});

describe("parse errors", () => {
	test("gf with no props fails", () => {
		expect(parseSource(wrap("gf f { }")).diagnostics.length).toBeGreaterThan(0);
	});
	test("gf missing closing brace fails", () => {
		expect(
			parseSource(wrap("gf f { xscale: [0, 1] ypts: [0, 1]")).diagnostics
				.length,
		).toBeGreaterThan(0);
	});
	test("numList missing closing bracket fails", () => {
		expect(
			parseSource(wrap("gf f { xscale: [0, 1 ypts: [0, 1] }")).diagnostics
				.length,
		).toBeGreaterThan(0);
	});
});
