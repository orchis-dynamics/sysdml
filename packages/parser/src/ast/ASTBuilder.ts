import { ParserRuleContext, TerminalNode } from "antlr4ng";

import {
	AddExprContext,
	AndExprContext,
	AuxDeclContext,
	AuxMetaPosContext,
	ConnPropContext,
	DeclContext,
	EndpointContext,
	EqExprContext,
	EqFallthroughContext,
	ExprContext,
	FileContext,
	FlowConnectionContext,
	FlowDeclContext,
	FlowPropContext,
	FunctionCallContext,
	GfDeclContext,
	GfKindPropContext,
	GfKindValueContext,
	GfPropContext,
	GfXPtsPropContext,
	GfXScalePropContext,
	GfYPtsPropContext,
	GfYScalePropContext,
	GroupedExprContext,
	IdentRefContext,
	IfThenElseExprContext,
	ModelDeclContext,
	MulExprContext,
	NegativeCausalContext,
	NotExprContext,
	NotOpContext,
	NumberContext,
	NumberLiteralContext,
	NumListContext,
	OrExprContext,
	OrFallthroughContext,
	PosArrayContext,
	PosLiteralContext,
	PositiveCausalContext,
	PowExprContext,
	PowFallthroughContext,
	PowPrimaryContext,
	PowerExprContext,
	PrimaryContext,
	RelExprContext,
	SignedNumberContext,
	StockDeclContext,
	StockPropContext,
	TimeDeclContext,
	TimePropContext,
	UnaryExprContext,
	UnaryMinusContext,
	UnaryPlusContext,
} from "../../generated/SYSDMLParser.js";
import type {
	AuxiliaryDeclarationNode,
	BinaryExpressionNode,
	ConnectionDeclarationNode,
	DeclarationNode,
	Diagnostic,
	EndpointNode,
	ExpressionNode,
	FileNode,
	FlowDeclarationNode,
	FlowPropertyNode,
	FunctionCallNode,
	GraphicalFunctionBodyNode,
	GraphicalFunctionDeclarationNode,
	GraphicalFunctionPropertyNode,
	GroupedExpressionNode,
	IdentifierReferenceNode,
	IfThenElseNode,
	ModelDeclarationNode,
	NumberLiteralNode,
	NumberListNode,
	PositionNode,
	SignedNumberNode,
	Span,
	StockDeclarationNode,
	StockPropertyNode,
	TimeDeclarationNode,
	TimePropertyNode,
	UnaryExpressionNode,
} from "./types.js";

// ── Span helpers ─────────────────────────────────────────────────────────────

// Spans are 1-based for both line and col, end-inclusive.
// ANTLR gives line as 1-based but column as 0-based, so we shift columns by +1.
function spanOf(ctx: ParserRuleContext): Span {
	const start = ctx.start!;
	const stop = ctx.stop ?? ctx.start!;
	return {
		start: { line: start.line, col: start.column + 1 },
		end: { line: stop.line, col: stop.column + (stop.text?.length ?? 0) },
	};
}

function tokenSpan(tok: TerminalNode): Span {
	const t = tok.symbol;
	const len = t.text?.length ?? 1;
	return {
		start: { line: t.line, col: t.column + 1 },
		end: { line: t.line, col: t.column + len },
	};
}

// ── Operator narrowing helpers ────────────────────────────────────────────────

function asAddOp(text: string): "+" | "-" {
	if (text === "+" || text === "-") return text;
	throw new Error(`Expected additive operator, got: ${text}`);
}

function asMulOp(text: string): "*" | "/" | "MOD" {
	if (text === "*" || text === "/" || text === "MOD") return text;
	throw new Error(`Expected multiplicative operator, got: ${text}`);
}

function asRelOp(text: string): "<" | "<=" | ">" | ">=" {
	if (text === "<" || text === "<=" || text === ">" || text === ">=")
		return text;
	throw new Error(`Expected relational operator, got: ${text}`);
}

function asEqOp(text: string): "=" | "<>" {
	// Fold C-style aliases to canonical XMILE forms so the AST has one shape.
	if (text === "=" || text === "==") return "=";
	if (text === "<>" || text === "!=") return "<>";
	throw new Error(`Expected equality operator, got: ${text}`);
}

// ── Builder ───────────────────────────────────────────────────────────────────

export class ASTBuilder {
	private diagnostics: Diagnostic[] = [];

	private reportError(message: string, span: Span): void {
		this.diagnostics.push({ message, span });
	}

	build(ctx: FileContext): { ast: FileNode; diagnostics: Diagnostic[] } {
		const ast = this.file(ctx);
		return { ast, diagnostics: this.diagnostics };
	}

	private file(ctx: FileContext): FileNode {
		const modelContexts = ctx.modelDecl();
		const models = modelContexts.map((mc) => this.modelDecl(mc));
		const [entry, ...submodels] = models;
		return {
			type: "File",
			model: entry,
			submodels,
			decls: ctx.decl().map((declContext) => this.decl(declContext)),
			span: spanOf(ctx),
		};
	}

	private modelDecl(ctx: ModelDeclContext): ModelDeclarationNode {
		if (!ctx.CLD() && !ctx.SFD()) {
			throw new Error(
				"Grammar invariant violated: modelDecl matched neither CLD nor SFD",
			);
		}
		const kind: "cld" | "sfd" = ctx.CLD() ? "cld" : "sfd";
		return {
			type: "ModelDeclaration",
			id: ctx.IDENT().getText(),
			idSpan: tokenSpan(ctx.IDENT()),
			kind,
			span: spanOf(ctx),
		};
	}

	private decl(ctx: DeclContext): DeclarationNode {
		const time = ctx.timeDecl();
		if (time) return this.timeDecl(time);

		const stock = ctx.stockDecl();
		if (stock) return this.stockDecl(stock);

		const aux = ctx.auxDecl();
		if (aux) return this.auxDecl(aux);

		const flow = ctx.flowDecl();
		if (flow) return this.flowDecl(flow);

		const graphicalFunctionDecl = ctx.gfDecl();
		if (graphicalFunctionDecl) return this.gfDecl(graphicalFunctionDecl);

		const connectionDecl = ctx.connectionDecl()!;
		if (connectionDecl instanceof PositiveCausalContext)
			return this.positiveCausal(connectionDecl);
		if (connectionDecl instanceof NegativeCausalContext)
			return this.negativeCausal(connectionDecl);
		if (connectionDecl instanceof FlowConnectionContext)
			return this.flowConnection(connectionDecl);

		throw new Error(
			`Unrecognised connectionDecl subtype: ${connectionDecl.constructor.name}`,
		);
	}

	private timeDecl(ctx: TimeDeclContext): TimeDeclarationNode {
		return {
			type: "TimeDeclaration",
			props: ctx
				.timeProp()
				.map((timePropContext) => this.timeProp(timePropContext)),
			span: spanOf(ctx),
		};
	}

	private timeProp(ctx: TimePropContext): TimePropertyNode {
		const key: "start" | "end" | "step" = ctx.START()
			? "start"
			: ctx.END()
				? "end"
				: "step";
		return {
			type: "TimeProperty",
			key,
			value: buildNumber(ctx.number()),
			span: spanOf(ctx),
		};
	}

	private stockDecl(ctx: StockDeclContext): StockDeclarationNode {
		const allProps = ctx.stockProp();
		const initProps = allProps.filter((p) => p.INIT() !== null);
		const posProp = allProps.find((p) => p.POSITION() !== null);

		let position: PositionNode | undefined;
		if (posProp) {
			const posLit = posProp.posLiteral();
			if (!posLit) throw new Error("stockDecl: POSITION prop has no posLiteral");
			position = this.buildPosLiteral(posLit) ?? undefined;
		}

		return {
			type: "StockDeclaration",
			id: ctx.IDENT().getText(),
			idSpan: tokenSpan(ctx.IDENT()),
			props: initProps.map((p) => this.stockProp(p)),
			position,
			span: spanOf(ctx),
		};
	}

	private stockProp(ctx: StockPropContext): StockPropertyNode {
		return {
			type: "StockProperty",
			init: buildExpr(ctx.expr()!),
			span: spanOf(ctx),
		};
	}

	private flowDecl(ctx: FlowDeclContext): FlowDeclarationNode {
		const allProps = ctx.flowProp();
		const regularProps = allProps.filter(
			(p) => p.FROM() !== null || p.TO() !== null || p.RATE() !== null,
		);
		const posProp = allProps.find((p) => p.POSITION() !== null);
		const viaProp = allProps.find((p) => p.VIA() !== null);

		let position: PositionNode | undefined;
		if (posProp) {
			const posLit = posProp.posLiteral();
			if (!posLit) throw new Error("flowDecl: POSITION prop has no posLiteral");
			position = this.buildPosLiteral(posLit) ?? undefined;
		}

		let via: PositionNode[] | undefined;
		if (viaProp) {
			const posArr = viaProp.posArray();
			if (!posArr) throw new Error("flowDecl: VIA prop has no posArray");
			via = this.buildPosArray(posArr);
		}

		return {
			type: "FlowDeclaration",
			id: ctx.IDENT().getText(),
			idSpan: tokenSpan(ctx.IDENT()),
			props: regularProps.map((p) => this.flowProp(p)),
			position,
			via,
			span: spanOf(ctx),
		};
	}

	private flowProp(ctx: FlowPropContext): FlowPropertyNode {
		if (ctx.FROM()) {
			return {
				type: "FlowProperty",
				key: "from",
				value: this.endpoint(ctx.endpoint()!),
				span: spanOf(ctx),
			};
		}
		if (ctx.TO()) {
			return {
				type: "FlowProperty",
				key: "to",
				value: this.endpoint(ctx.endpoint()!),
				span: spanOf(ctx),
			};
		}
		return {
			type: "FlowProperty",
			key: "rate",
			value: buildExpr(ctx.expr()!),
			span: spanOf(ctx),
		};
	}

	private auxDecl(ctx: AuxDeclContext): AuxiliaryDeclarationNode {
		const id = ctx.IDENT().getText();
		const idSpan = tokenSpan(ctx.IDENT());
		const expr = buildExpr(ctx.expr());

		let position: PositionNode | undefined;
		const seenKeys = new Set<string>();
		for (const prop of ctx.auxMetaProp()) {
			if (prop instanceof AuxMetaPosContext) {
				if (seenKeys.has("position")) {
					this.reportError("duplicate 'position' in aux metadata block", spanOf(prop));
				} else {
					seenKeys.add("position");
					position = this.buildPosLiteral(prop.posLiteral()) ?? undefined;
				}
			}
		}

		return {
			type: "AuxiliaryDeclaration",
			id,
			idSpan,
			expr,
			position,
			span: spanOf(ctx),
		};
	}

	private gfDecl(ctx: GfDeclContext): GraphicalFunctionDeclarationNode {
		return {
			type: "GraphicalFunctionDeclaration",
			id: ctx.IDENT().getText(),
			idSpan: tokenSpan(ctx.IDENT()),
			body: this.buildGraphicalFunctionBody(ctx.gfProp(), spanOf(ctx)),
			span: spanOf(ctx),
		};
	}

	private buildGraphicalFunctionBody(props: GfPropContext[], bodySpan: Span): GraphicalFunctionBodyNode {
		const validKinds = ["linear", "extra", "step"];
		const seenKeys = new Set<string>();
		const builtProps: GraphicalFunctionPropertyNode[] = [];

		for (const propCtx of props) {
			const node = this.gfProp(propCtx);
			if (seenKeys.has(node.key)) {
				this.reportError(`duplicate '${node.key}' in gf body`, node.span);
			} else {
				seenKeys.add(node.key);
			}
			builtProps.push(node);

			if (node.key === "kind" && !validKinds.includes(node.value)) {
				this.reportError(
					`'kind' must be one of linear, extra, step (got '${node.value}')`,
					node.span,
				);
			}
		}

		if (!seenKeys.has("ypts")) {
			this.reportError("gf body missing required 'ypts'", bodySpan);
		}
		if (seenKeys.has("xscale") && seenKeys.has("xpts")) {
			this.reportError(
				"gf body cannot have both 'xscale' and 'xpts' — they are alternatives",
				bodySpan,
			);
		}

		return {
			type: "GraphicalFunctionBody",
			props: builtProps,
			span: bodySpan,
		};
	}

	private gfProp(ctx: GfPropContext): GraphicalFunctionPropertyNode {
		if (ctx instanceof GfKindPropContext) {
			const kindCtx: GfKindValueContext = ctx.gfKindValue();
			const kindText = (kindCtx.IDENT() ?? kindCtx.STEP())!.getText();
			return {
				type: "GraphicalFunctionProperty",
				key: "kind",
				value: kindText,
				span: spanOf(ctx),
			};
		}
		if (ctx instanceof GfXScalePropContext) {
			return {
				type: "GraphicalFunctionProperty",
				key: "xscale",
				value: buildNumberList(ctx.numList()),
				span: spanOf(ctx),
			};
		}
		if (ctx instanceof GfXPtsPropContext) {
			return {
				type: "GraphicalFunctionProperty",
				key: "xpts",
				value: buildNumberList(ctx.numList()),
				span: spanOf(ctx),
			};
		}
		if (ctx instanceof GfYPtsPropContext) {
			return {
				type: "GraphicalFunctionProperty",
				key: "ypts",
				value: buildNumberList(ctx.numList()),
				span: spanOf(ctx),
			};
		}
		if (ctx instanceof GfYScalePropContext) {
			return {
				type: "GraphicalFunctionProperty",
				key: "yscale",
				value: buildNumberList(ctx.numList()),
				span: spanOf(ctx),
			};
		}
		throw new Error(`Unrecognised gfProp subtype: ${ctx.constructor.name}`);
	}

	private endpoint(ctx: EndpointContext): EndpointNode {
		const ident = ctx.IDENT();
		return {
			type: "Endpoint",
			value: ident ? ident.getText() : null,
			span: spanOf(ctx),
		};
	}

	private connProps(props: ConnPropContext[]): { angle?: number; via?: PositionNode } {
		let angle: number | undefined;
		let via: PositionNode | undefined;
		for (const prop of props) {
			if (prop.ANGLE() !== null) {
				const signedNum = prop.signedNumber();
				if (!signedNum) throw new Error("connProp: ANGLE present but no signedNumber");
				angle = signedNumberToFloat(signedNum);
			} else {
				const pos = prop.posLiteral();
				if (!pos) throw new Error("connProp: VIA present but no posLiteral");
				via = this.buildPosLiteral(pos) ?? undefined;
			}
		}
		return { angle, via };
	}

	private positiveCausal(ctx: PositiveCausalContext): ConnectionDeclarationNode {
		const { angle, via } = this.connProps(ctx.connProp());
		return {
			type: "ConnectionDeclaration",
			from: ctx.IDENT(0)!.getText(),
			fromSpan: tokenSpan(ctx.IDENT(0)!),
			polarity: "+",
			to: ctx.IDENT(1)!.getText(),
			toSpan: tokenSpan(ctx.IDENT(1)!),
			angle,
			via,
			span: spanOf(ctx),
		};
	}

	private negativeCausal(ctx: NegativeCausalContext): ConnectionDeclarationNode {
		const { angle, via } = this.connProps(ctx.connProp());
		return {
			type: "ConnectionDeclaration",
			from: ctx.IDENT(0)!.getText(),
			fromSpan: tokenSpan(ctx.IDENT(0)!),
			polarity: "-",
			to: ctx.IDENT(1)!.getText(),
			toSpan: tokenSpan(ctx.IDENT(1)!),
			angle,
			via,
			span: spanOf(ctx),
		};
	}

	private flowConnection(ctx: FlowConnectionContext): ConnectionDeclarationNode {
		const { angle, via } = this.connProps(ctx.connProp());
		return {
			type: "ConnectionDeclaration",
			from: ctx.IDENT(0)!.getText(),
			fromSpan: tokenSpan(ctx.IDENT(0)!),
			polarity: "=>",
			to: ctx.IDENT(1)!.getText(),
			toSpan: tokenSpan(ctx.IDENT(1)!),
			angle,
			via,
			span: spanOf(ctx),
		};
	}

	// Returns null on semantic error (a diagnostic is reported). Callers should
	// treat null as "drop this position" — the AST node it was attached to is
	// otherwise complete.
	private buildPosLiteral(ctx: PosLiteralContext): PositionNode | null {
		const ident0 = ctx.IDENT(0);
		const ident1 = ctx.IDENT(1);
		const sn0 = ctx.signedNumber(0);
		const sn1 = ctx.signedNumber(1);
		if (!ident0 || !ident1 || !sn0 || !sn1) {
			throw new Error("posLiteral: expected two key:value pairs");
		}
		const key0 = ident0.getText();
		const key1 = ident1.getText();
		const num0 = signedNumberToFloat(sn0);
		const num1 = signedNumberToFloat(sn1);

		if (key0 === "x" && key1 === "y") {
			return { type: "Position", x: num0, y: num1, span: spanOf(ctx) };
		}
		if (key0 === "y" && key1 === "x") {
			return { type: "Position", x: num1, y: num0, span: spanOf(ctx) };
		}
		this.reportError(
			`position literal keys must be 'x' and 'y', got '${key0}' and '${key1}'`,
			spanOf(ctx),
		);
		return null;
	}

	private buildPosArray(ctx: PosArrayContext): PositionNode[] {
		const result: PositionNode[] = [];
		for (const litCtx of ctx.posLiteral()) {
			const pos = this.buildPosLiteral(litCtx);
			if (pos !== null) result.push(pos);
		}
		return result;
	}
}

// ── Expression builders (standalone — no instance state needed) ───────────────
//
// The grammar's expression cascade (lowest → highest precedence):
//   expr → orExpr → andExpr → notExpr → eqExpr → relExpr →
//   addExpr → mulExpr → unaryExpr → primary
// IF/THEN/ELSE sits at the top of `expr` as a labelled alternative.
//
// Each binary cascading layer (orExpr, andExpr, eqExpr, relExpr, addExpr, mulExpr)
// follows the same left-associative loop pattern.

function buildExpr(ctx: ExprContext): ExpressionNode {
	if (ctx instanceof IfThenElseExprContext) {
		const exprs = ctx.expr();
		return {
			type: "IfThenElse",
			cond: buildExpr(exprs[0]),
			thenBranch: buildExpr(exprs[1]),
			elseBranch: buildExpr(exprs[2]),
			span: spanOf(ctx),
		} satisfies IfThenElseNode;
	}
	if (ctx instanceof OrFallthroughContext) {
		return buildOrExpr(ctx.orExpr());
	}
	throw new Error(`Unrecognised expr subtype: ${ctx.constructor.name}`);
}

function buildOrExpr(ctx: OrExprContext): ExpressionNode {
	const ands = ctx.andExpr();
	let result: ExpressionNode = buildAndExpr(ands[0]);
	for (let i = 1; i < ands.length; i++) {
		const right = buildAndExpr(ands[i]);
		const span: Span = { start: result.span.start, end: right.span.end };
		result = {
			type: "BinaryExpression",
			op: "OR",
			left: result,
			right,
			span,
		} satisfies BinaryExpressionNode;
	}
	return result;
}

function buildAndExpr(ctx: AndExprContext): ExpressionNode {
	const nots = ctx.notExpr();
	let result: ExpressionNode = buildNotExpr(nots[0]);
	for (let i = 1; i < nots.length; i++) {
		const right = buildNotExpr(nots[i]);
		const span: Span = { start: result.span.start, end: right.span.end };
		result = {
			type: "BinaryExpression",
			op: "AND",
			left: result,
			right,
			span,
		} satisfies BinaryExpressionNode;
	}
	return result;
}

function buildNotExpr(ctx: NotExprContext): ExpressionNode {
	if (ctx instanceof NotOpContext) {
		const operand = buildNotExpr(ctx.notExpr());
		// The leading terminal is either NOT or BANG ('!') — both fold to op: 'NOT'.
		const notTok = ctx.NOT() ?? ctx.BANG()!;
		const notSpan = tokenSpan(notTok);
		const span: Span = { start: notSpan.start, end: operand.span.end };
		return {
			type: "UnaryExpression",
			op: "NOT",
			operand,
			span,
		} satisfies UnaryExpressionNode;
	}
	if (ctx instanceof EqFallthroughContext) {
		return buildEqExpr(ctx.eqExpr());
	}
	throw new Error(`Unrecognised notExpr subtype: ${ctx.constructor.name}`);
}

function buildEqExpr(ctx: EqExprContext): ExpressionNode {
	const rels = ctx.relExpr();
	let result: ExpressionNode = buildRelExpr(rels[0]);
	for (let i = 1; i < rels.length; i++) {
		const child = ctx.getChild(2 * i - 1);
		if (!(child instanceof TerminalNode))
			throw new Error("Expected operator terminal in eqExpr");
		const right = buildRelExpr(rels[i]);
		const span: Span = { start: result.span.start, end: right.span.end };
		result = {
			type: "BinaryExpression",
			op: asEqOp(child.getText()),
			left: result,
			right,
			span,
		} satisfies BinaryExpressionNode;
	}
	return result;
}

function buildRelExpr(ctx: RelExprContext): ExpressionNode {
	const adds = ctx.addExpr();
	let result: ExpressionNode = buildAddExpr(adds[0]);
	for (let i = 1; i < adds.length; i++) {
		const child = ctx.getChild(2 * i - 1);
		if (!(child instanceof TerminalNode))
			throw new Error("Expected operator terminal in relExpr");
		const right = buildAddExpr(adds[i]);
		const span: Span = { start: result.span.start, end: right.span.end };
		result = {
			type: "BinaryExpression",
			op: asRelOp(child.getText()),
			left: result,
			right,
			span,
		} satisfies BinaryExpressionNode;
	}
	return result;
}

function buildAddExpr(ctx: AddExprContext): ExpressionNode {
	const muls = ctx.mulExpr();
	let result: ExpressionNode = buildMulExpr(muls[0]);
	for (let i = 1; i < muls.length; i++) {
		const child = ctx.getChild(2 * i - 1);
		if (!(child instanceof TerminalNode))
			throw new Error("Expected operator terminal in addExpr");
		const right = buildMulExpr(muls[i]);
		const span: Span = { start: result.span.start, end: right.span.end };
		result = {
			type: "BinaryExpression",
			op: asAddOp(child.getText()),
			left: result,
			right,
			span,
		} satisfies BinaryExpressionNode;
	}
	return result;
}

function buildMulExpr(ctx: MulExprContext): ExpressionNode {
	const unaries = ctx.unaryExpr();
	let result: ExpressionNode = buildUnaryExpression(unaries[0]);
	for (let i = 1; i < unaries.length; i++) {
		const child = ctx.getChild(2 * i - 1);
		if (!(child instanceof TerminalNode))
			throw new Error("Expected operator terminal in mulExpr");
		const right = buildUnaryExpression(unaries[i]);
		const span: Span = { start: result.span.start, end: right.span.end };
		result = {
			type: "BinaryExpression",
			op: asMulOp(child.getText()),
			left: result,
			right,
			span,
		} satisfies BinaryExpressionNode;
	}
	return result;
}

function buildPowExpr(ctx: PowExprContext): ExpressionNode {
	if (ctx instanceof PowerExprContext) {
		const left = buildPrimary(ctx.primary());
		const right = buildPowExpr(ctx.powExpr());
		return {
			type: "BinaryExpression",
			op: "^",
			left,
			right,
			span: spanOf(ctx),
		} satisfies BinaryExpressionNode;
	}
	if (ctx instanceof PowPrimaryContext) {
		return buildPrimary(ctx.primary());
	}
	throw new Error(`Unrecognised powExpr subtype: ${ctx.constructor.name}`);
}

function buildUnaryExpression(ctx: UnaryExprContext): ExpressionNode {
	if (ctx instanceof UnaryMinusContext) {
		const operand = buildUnaryExpression(ctx.unaryExpr());
		const minusSpan = tokenSpan(ctx.MINUS());
		const span: Span = { start: minusSpan.start, end: operand.span.end };
		return {
			type: "UnaryExpression",
			op: "-",
			operand,
			span,
		} satisfies UnaryExpressionNode;
	}
	if (ctx instanceof UnaryPlusContext) {
		// Unary + is identity — fold away at AST level, no IR node needed.
		return buildUnaryExpression(ctx.unaryExpr());
	}
	if (ctx instanceof PowFallthroughContext) {
		return buildPowExpr(ctx.powExpr());
	}
	throw new Error(`Unrecognised unaryExpr subtype: ${ctx.constructor.name}`);
}

function buildPrimary(ctx: PrimaryContext): ExpressionNode {
	if (ctx instanceof NumberLiteralContext) {
		return buildNumber(ctx.number());
	}
	if (ctx instanceof FunctionCallContext) {
		const nameTok = ctx.IDENT();
		const args = ctx.expr().map((exprContext) => buildExpr(exprContext));
		return {
			type: "FunctionCall",
			name: nameTok.getText(),
			nameSpan: tokenSpan(nameTok),
			args,
			span: spanOf(ctx),
		} satisfies FunctionCallNode;
	}
	if (ctx instanceof IdentRefContext) {
		const tok = ctx.IDENT();
		return {
			type: "IdentifierReference",
			name: tok.getText(),
			span: tokenSpan(tok),
		} satisfies IdentifierReferenceNode;
	}
	if (ctx instanceof GroupedExprContext) {
		return {
			type: "GroupedExpression",
			expr: buildExpr(ctx.expr()),
			span: spanOf(ctx),
		} satisfies GroupedExpressionNode;
	}
	throw new Error(`Unrecognised primary subtype: ${ctx.constructor.name}`);
}

function buildNumber(ctx: NumberContext): NumberLiteralNode {
	const tok = ctx.INT() ?? ctx.DECIMAL();
	if (!tok) throw new Error("NumberContext has no INT or DECIMAL token");
	return { type: "NumberLiteral", value: tok.getText(), span: tokenSpan(tok) };
}

function buildNumberList(ctx: NumListContext): NumberListNode {
	return {
		type: "NumberList",
		values: ctx
			.signedNumber()
			.map((signedNumberContext) => buildSignedNumber(signedNumberContext)),
		span: spanOf(ctx),
	};
}

function buildSignedNumber(ctx: SignedNumberContext): SignedNumberNode {
	const negative = ctx.MINUS() !== null;
	const lit = buildNumber(ctx.number());
	return { type: "SignedNumber", negative, lit, span: spanOf(ctx) };
}

function signedNumberToFloat(ctx: SignedNumberContext): number {
	const negative = ctx.MINUS() !== null;
	const tok = ctx.number().INT() ?? ctx.number().DECIMAL();
	if (!tok) throw new Error("signedNumber has no INT or DECIMAL token");
	const value = parseFloat(tok.getText());
	return negative ? -value : value;
}

