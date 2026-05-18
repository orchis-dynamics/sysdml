import type {
	FileNode,
	DeclarationNode,
	TimeDeclarationNode,
	StockDeclarationNode,
	AuxiliaryDeclarationNode,
	FlowDeclarationNode,
	ConnectionDeclarationNode,
	GraphicalFunctionDeclarationNode,
	GraphicalFunctionBodyNode,
	NumberListNode,
	PositionNode,
	Span,
} from "@sysdml/parser";

import { DiagnosticCode } from "./diagnostics.js";
import { compileExpr, resetLookupCounter } from "./expr.js";
import type {
	IR,
	IRDiagnostic,
	CompileResult,
	IRStock,
	IRAuxiliary,
	IRFlow,
	IRGraphicalFunction,
	IRPosition,
} from "./types.js";

function isTimeDeclaration(n: DeclarationNode): n is TimeDeclarationNode {
	return n.type === "TimeDeclaration";
}
function isStockDeclaration(n: DeclarationNode): n is StockDeclarationNode {
	return n.type === "StockDeclaration";
}
function isAuxiliaryDeclaration(n: DeclarationNode): n is AuxiliaryDeclarationNode {
	return n.type === "AuxiliaryDeclaration";
}
function isFlowDeclaration(n: DeclarationNode): n is FlowDeclarationNode {
	return n.type === "FlowDeclaration";
}
function isConnectionDeclaration(n: DeclarationNode): n is ConnectionDeclarationNode {
	return n.type === "ConnectionDeclaration";
}
function isGraphicalFunctionDeclaration(n: DeclarationNode): n is GraphicalFunctionDeclarationNode {
	return n.type === "GraphicalFunctionDeclaration";
}

function numListToFloats(node: NumberListNode): number[] {
	return node.values.map(
		(signedNumber) =>
			(signedNumber.negative ? -1 : 1) * parseFloat(signedNumber.lit.value),
	);
}

function posToIR(pos: PositionNode | undefined): IRPosition | undefined {
	if (!pos) return undefined;
	return { x: pos.x, y: pos.y };
}

function validateGraphicalFunctionBody(
	id: string,
	body: GraphicalFunctionBodyNode,
	declSpan: Span,
	errors: IRDiagnostic[],
): IRGraphicalFunction | null {
	const kindProp = body.props.find((prop) => prop.key === "kind");
	const xscaleProp = body.props.find((prop) => prop.key === "xscale");
	const xptsProp = body.props.find((prop) => prop.key === "xpts");
	const yptsProp = body.props.find((prop) => prop.key === "ypts");
	const yscaleProp = body.props.find((prop) => prop.key === "yscale");

	let isValid = true;

	const rawKind = kindProp?.key === "kind" ? kindProp.value : "linear";
	if (!["linear", "extra", "step"].includes(rawKind as string)) {
		errors.push({
			code: DiagnosticCode.INVALID_GF_KIND,
			message: `'${id}': unknown kind '${rawKind}'; must be linear, extra, or step`,
			span: declSpan,
		});
		isValid = false;
	}
	const kind = rawKind as "linear" | "extra" | "step";

	if (!yptsProp) {
		errors.push({
			code: DiagnosticCode.MISSING_YPTS,
			message: `'${id}': ypts is required`,
			span: declSpan,
		});
		isValid = false;
	}

	if (!xscaleProp && !xptsProp) {
		errors.push({
			code: DiagnosticCode.MISSING_X_DEFINITION,
			message: `'${id}': must have either xscale or xpts`,
			span: declSpan,
		});
		isValid = false;
	}
	if (xscaleProp && xptsProp) {
		errors.push({
			code: DiagnosticCode.CONFLICTING_X_DEFINITION,
			message: `'${id}': cannot have both xscale and xpts`,
			span: declSpan,
		});
		isValid = false;
	}

	if (!isValid) return null;

	const ypts = numListToFloats(
		(yptsProp! as { key: "ypts"; value: NumberListNode }).value,
	);

	let xscale: [number, number] | null = null;
	if (xscaleProp && xscaleProp.key === "xscale") {
		const values = numListToFloats(xscaleProp.value);
		if (values.length !== 2) {
			errors.push({
				code: DiagnosticCode.XSCALE_WRONG_COUNT,
				message: `'${id}': xscale must have exactly 2 values (min and max), got ${values.length}`,
				span: declSpan,
			});
			isValid = false;
		} else {
			xscale = [values[0], values[1]];
		}
	}

	let xpts: number[] | null = null;
	if (xptsProp && xptsProp.key === "xpts") {
		const values = numListToFloats(xptsProp.value);
		if (values.length !== ypts.length) {
			errors.push({
				code: DiagnosticCode.XPTS_YPTS_COUNT_MISMATCH,
				message: `'${id}': xpts has ${values.length} values but ypts has ${ypts.length}; counts must match`,
				span: declSpan,
			});
			isValid = false;
		} else {
			for (let i = 1; i < values.length; i++) {
				if (values[i] <= values[i - 1]) {
					errors.push({
						code: DiagnosticCode.XPTS_NOT_ASCENDING,
						message: `'${id}': xpts values must be strictly ascending (index ${i - 1}=${values[i - 1]} >= index ${i}=${values[i]})`,
						span: declSpan,
					});
					isValid = false;
					break;
				}
			}
			if (isValid) xpts = values;
		}
	}

	if (kind === "step" && ypts.length >= 2) {
		if (ypts[ypts.length - 1] !== ypts[ypts.length - 2]) {
			errors.push({
				code: DiagnosticCode.STEP_LAST_YPTS_MISMATCH,
				message: `'${id}': kind step requires the last two y-values to be equal (got ${ypts[ypts.length - 2]} and ${ypts[ypts.length - 1]})`,
				span: declSpan,
			});
			isValid = false;
		}
	}

	if (!isValid) return null;

	let yscale: [number, number] | null = null;
	if (yscaleProp && yscaleProp.key === "yscale") {
		const values = numListToFloats(yscaleProp.value);
		if (values.length === 2) yscale = [values[0], values[1]];
	}

	return { id, kind, xscale, xpts, ypts, yscale };
}

export function compileAST(ast: FileNode): CompileResult {
	const errors: IRDiagnostic[] = [];
	const nonFatalDiagnostics: IRDiagnostic[] = [];

	// ── Collect typed decls ───────────────────────────────────────────────────

	const timeDecls = ast.decls.filter(isTimeDeclaration);
	const stockDecls = ast.decls.filter(isStockDeclaration);
	const auxDecls = ast.decls.filter(isAuxiliaryDeclaration);
	const flowDecls = ast.decls.filter(isFlowDeclaration);
	const connectionDecls = ast.decls.filter(isConnectionDeclaration);
	const graphicalFunctionDecls = ast.decls.filter(isGraphicalFunctionDeclaration);

	// ── Multi-model rejection (B1) ────────────────────────────────────────────
	// v0.1 supports a single model per file. The grammar accepts model_decl+
	// (future-proofing for submodels); any extra model declaration here is
	// rejected with a diagnostic and ignored by the rest of the compile pass.
	// These are non-fatal: the entry model still compiles into the IR.
	for (const extra of ast.extraModels) {
		nonFatalDiagnostics.push({
			code: DiagnosticCode.MULTI_MODEL_NOT_SUPPORTED,
			message: `Multi-model files are not supported in v0.1 (extra model '${extra.id}'). Only the first model declaration is compiled.`,
			span: extra.span,
		});
	}

	// ── Structural validation ─────────────────────────────────────────────────

	if (timeDecls.length === 0)
		errors.push({
			code: DiagnosticCode.MISSING_TIME_BLOCK,
			message: "Missing required time block",
		});
	if (timeDecls.length > 1)
		errors.push({
			code: DiagnosticCode.DUPLICATE_TIME_BLOCK,
			message: "Only one time block is allowed",
			span: timeDecls[1].span,
		});
	if (stockDecls.length === 0)
		errors.push({
			code: DiagnosticCode.MISSING_STOCK,
			message: "At least one stock is required",
		});

	// ── Duplicate ID check ────────────────────────────────────────────────────

	const allIdDecls: Array<{ id: string; span: Span }> = [
		...stockDecls.map((stockDecl) => ({ id: stockDecl.id, span: stockDecl.idSpan })),
		...auxDecls.map((auxDecl) => ({ id: auxDecl.id, span: auxDecl.idSpan })),
		...flowDecls.map((flowDecl) => ({ id: flowDecl.id, span: flowDecl.idSpan })),
	];
	const seenIds = new Set<string>();
	for (const { id, span } of allIdDecls) {
		if (seenIds.has(id))
			errors.push({
				code: DiagnosticCode.DUPLICATE_IDENTIFIER,
				message: `Duplicate identifier '${id}'`,
				span,
			});
		seenIds.add(id);
	}

	// ── GF name uniqueness and conflict checks ────────────────────────────────

	const seenGraphicalFunctionIds = new Set<string>();
	for (const graphicalFunctionDecl of graphicalFunctionDecls) {
		if (seenGraphicalFunctionIds.has(graphicalFunctionDecl.id)) {
			errors.push({
				code: DiagnosticCode.DUPLICATE_GF,
				message: `Duplicate graphical function '${graphicalFunctionDecl.id}'`,
				span: graphicalFunctionDecl.span,
			});
		}
		seenGraphicalFunctionIds.add(graphicalFunctionDecl.id);
		if (seenIds.has(graphicalFunctionDecl.id)) {
			errors.push({
				code: DiagnosticCode.GF_NAME_CONFLICT,
				message: `Graphical function '${graphicalFunctionDecl.id}' conflicts with a stock, aux, or flow of the same name`,
				span: graphicalFunctionDecl.span,
			});
		}
	}

	// ── Time ──────────────────────────────────────────────────────────────────

	const timeDecl = timeDecls[0];
	let time = { start: 0, end: 0, step: 1 };

	if (timeDecl) {
		const getTimePropertyValue = (key: "start" | "end" | "step"): number => {
			const prop = timeDecl.props.find((timeProp) => timeProp.key === key);
			return prop ? parseFloat(prop.value.value) : 0;
		};
		time = {
			start: getTimePropertyValue("start"),
			end: getTimePropertyValue("end"),
			step: getTimePropertyValue("step"),
		};

		if (time.step <= 0)
			errors.push({
				code: DiagnosticCode.INVALID_TIME_STEP,
				message: `time.step must be greater than 0 (got ${time.step})`,
				span: timeDecl.span,
			});
		if (time.end < time.start)
			errors.push({
				code: DiagnosticCode.INVALID_TIME_RANGE,
				message: `time.end must be >= time.start (${time.end} < ${time.start})`,
				span: timeDecl.span,
			});
	}

	// ── Build valid ID set ────────────────────────────────────────────────────

	const validIds = new Set<string>([
		...stockDecls.map((stockDecl) => stockDecl.id),
		...auxDecls.map((auxDecl) => auxDecl.id),
	]);

	const graphicalFunctionNames = new Set<string>(
		graphicalFunctionDecls.map(
			(graphicalFunctionDecl) => graphicalFunctionDecl.id,
		),
	);

	// ── Validate and build IRGraphicalFunction list ───────────────────────────

	resetLookupCounter();
	const syntheticGraphicalFunctions: IRGraphicalFunction[] = [];

	const declaredGraphicalFunctions: IRGraphicalFunction[] = [];
	for (const graphicalFunctionDecl of graphicalFunctionDecls) {
		const irGraphicalFunction = validateGraphicalFunctionBody(
			graphicalFunctionDecl.id,
			graphicalFunctionDecl.body,
			graphicalFunctionDecl.span,
			errors,
		);
		if (irGraphicalFunction) {
			declaredGraphicalFunctions.push(irGraphicalFunction);
		}
	}

	// ── Stocks ────────────────────────────────────────────────────────────────

	const stocks: IRStock[] = stockDecls.map((stockDecl) => {
		const initProp = stockDecl.props.find((prop) => prop.type === "StockProperty");
		if (!initProp) {
			errors.push({
				code: DiagnosticCode.MISSING_STOCK_INIT,
				message: `Stock '${stockDecl.id}' is missing init`,
				span: stockDecl.span,
			});
			return { id: stockDecl.id, init: { type: "Number", value: 0 }, position: posToIR(stockDecl.position) };
		}
		return {
			id: stockDecl.id,
			init: compileExpr(
				initProp.init,
				validIds,
				graphicalFunctionNames,
				errors,
				syntheticGraphicalFunctions,
			),
			position: posToIR(stockDecl.position),
		};
	});

	// ── Aux ───────────────────────────────────────────────────────────────────

	const auxiliaries: IRAuxiliary[] = auxDecls.map((auxDecl) => ({
		id: auxDecl.id,
		expr: compileExpr(
			auxDecl.expr,
			validIds,
			graphicalFunctionNames,
			errors,
			syntheticGraphicalFunctions,
		),
		position: posToIR(auxDecl.position),
	}));

	// ── Flows ─────────────────────────────────────────────────────────────────

	const stockIds = new Set(stockDecls.map((stockDecl) => stockDecl.id));

	const flows: IRFlow[] = flowDecls.map((flowDecl) => {
		const fromProp = flowDecl.props.find((prop) => prop.key === "from");
		const toProp = flowDecl.props.find((prop) => prop.key === "to");
		const rateProp = flowDecl.props.find((prop) => prop.key === "rate");

		let from: string | null = null;
		let to: string | null = null;

		if (fromProp && fromProp.key === "from") {
			from = fromProp.value.value;
			if (from !== null && !stockIds.has(from)) {
				errors.push({
					code: DiagnosticCode.INVALID_FLOW_ENDPOINT,
					message: `Flow '${flowDecl.id}' from references unknown stock '${from}'`,
					span: flowDecl.span,
				});
			}
		} else {
			errors.push({
				code: DiagnosticCode.MISSING_FLOW_PROPERTY,
				message: `Flow '${flowDecl.id}' is missing 'from' property`,
				span: flowDecl.span,
			});
		}

		if (toProp && toProp.key === "to") {
			to = toProp.value.value;
			if (to !== null && !stockIds.has(to)) {
				errors.push({
					code: DiagnosticCode.INVALID_FLOW_ENDPOINT,
					message: `Flow '${flowDecl.id}' to references unknown stock '${to}'`,
					span: flowDecl.span,
				});
			}
		} else {
			errors.push({
				code: DiagnosticCode.MISSING_FLOW_PROPERTY,
				message: `Flow '${flowDecl.id}' is missing 'to' property`,
				span: flowDecl.span,
			});
		}

		if (!rateProp || rateProp.key !== "rate") {
			errors.push({
				code: DiagnosticCode.MISSING_FLOW_PROPERTY,
				message: `Flow '${flowDecl.id}' is missing 'rate' property`,
				span: flowDecl.span,
			});
			return {
				id: flowDecl.id,
				from,
				to,
				rate: { type: "Number", value: 0 },
				position: posToIR(flowDecl.position),
				via: flowDecl.via?.map((p) => ({ x: p.x, y: p.y })),
			};
		}

		return {
			id: flowDecl.id,
			from,
			to,
			rate: compileExpr(
				rateProp.value,
				validIds,
				graphicalFunctionNames,
				errors,
				syntheticGraphicalFunctions,
			),
			position: posToIR(flowDecl.position),
			via: flowDecl.via?.map((p) => ({ x: p.x, y: p.y })),
		};
	});

	// ── Connections ───────────────────────────────────────────────────────────

	const connections = connectionDecls.map((connectionDecl) => ({
		from: connectionDecl.from,
		polarity: connectionDecl.polarity,
		to: connectionDecl.to,
		angle: connectionDecl.angle,
		via: connectionDecl.via ? { x: connectionDecl.via.x, y: connectionDecl.via.y } : undefined,
	}));

	// ── Emit ──────────────────────────────────────────────────────────────────

	if (errors.length > 0) {
		return { ir: null, diagnostics: [...nonFatalDiagnostics, ...errors] };
	}

	const ir: IR = {
		ir_version: "0.1",
		model: { id: ast.model.id },
		time,
		stocks,
		auxiliaries,
		flows,
		connections,
		graphicalFunctions: [
			...declaredGraphicalFunctions,
			...syntheticGraphicalFunctions,
		],
	};

	return { ir, diagnostics: nonFatalDiagnostics };
}
