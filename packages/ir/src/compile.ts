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
	IR,
	IRDiagnostic,
	CompileResult,
	IRStock,
	IRAuxiliary,
	IRFlow,
	IRGraphicalFunction,
	IRGraphicalFunctionKind,
	IRPosition,
	IRTime,
} from "@sysdml/contracts";
import { BUILTIN_FUNCTIONS, DiagnosticCode } from "@sysdml/contracts";

import { compileExpr, RESERVED_LOOKUP_PREFIX } from "./expr.js";

type WarningDiagnostic = IRDiagnostic & { severity: "warning" };

function isTimeDeclaration(n: DeclarationNode): n is TimeDeclarationNode {
	return n.type === "TimeDeclaration";
}
function isStockDeclaration(n: DeclarationNode): n is StockDeclarationNode {
	return n.type === "StockDeclaration";
}
function isAuxiliaryDeclaration(
	n: DeclarationNode,
): n is AuxiliaryDeclarationNode {
	return n.type === "AuxiliaryDeclaration";
}
function isFlowDeclaration(n: DeclarationNode): n is FlowDeclarationNode {
	return n.type === "FlowDeclaration";
}
function isConnectionDeclaration(
	n: DeclarationNode,
): n is ConnectionDeclarationNode {
	return n.type === "ConnectionDeclaration";
}
function isGraphicalFunctionDeclaration(
	n: DeclarationNode,
): n is GraphicalFunctionDeclarationNode {
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

function isGraphicalFunctionKind(
	value: string,
): value is IRGraphicalFunctionKind {
	return value === "linear" || value === "extra" || value === "step";
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

	const rawKind =
		kindProp && kindProp.key === "kind" ? kindProp.value : "linear";
	let kind: IRGraphicalFunctionKind = "linear";
	if (isGraphicalFunctionKind(rawKind)) {
		kind = rawKind;
	} else {
		errors.push({
			code: DiagnosticCode.INVALID_GF_KIND,
			message: `'${id}': unknown kind '${rawKind}'; must be linear, extra, or step`,
			span: declSpan,
		});
		isValid = false;
	}

	const ypts =
		yptsProp && yptsProp.key === "ypts"
			? numListToFloats(yptsProp.value)
			: null;
	if (ypts === null) {
		errors.push({
			code: DiagnosticCode.MISSING_YPTS,
			message: `'${id}': ypts is required`,
			span: declSpan,
		});
		isValid = false;
	} else if (ypts.length < 2) {
		errors.push({
			code: DiagnosticCode.YPTS_TOO_FEW,
			message: `'${id}': ypts must have at least 2 values (got ${ypts.length})`,
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

	if (!isValid || ypts === null) return null;

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
		} else if (values[0] >= values[1]) {
			errors.push({
				code: DiagnosticCode.XSCALE_NOT_ASCENDING,
				message: `'${id}': xscale min must be less than max (got [${values[0]}, ${values[1]}])`,
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

	let yscale: [number, number] | null = null;
	if (yscaleProp && yscaleProp.key === "yscale") {
		const values = numListToFloats(yscaleProp.value);
		if (values.length !== 2) {
			errors.push({
				code: DiagnosticCode.YSCALE_WRONG_COUNT,
				message: `'${id}': yscale must have exactly 2 values (min and max), got ${values.length}`,
				span: declSpan,
			});
			isValid = false;
		} else {
			yscale = [values[0], values[1]];
		}
	}

	if (!isValid) return null;

	return { id, kind, xscale, xpts, ypts, yscale };
}

function validateGraphicalFunctionIdentifier(
	graphicalFunctionDecl: GraphicalFunctionDeclarationNode,
	errors: IRDiagnostic[],
): void {
	const id = graphicalFunctionDecl.id;
	if (BUILTIN_FUNCTIONS.has(id.toUpperCase())) {
		errors.push({
			code: DiagnosticCode.IDENTIFIER_SHADOWS_BUILTIN,
			message: `Graphical function identifier '${id}' shadows builtin function '${id.toUpperCase()}'`,
			span: graphicalFunctionDecl.idSpan,
		});
	}
	if (id.startsWith(RESERVED_LOOKUP_PREFIX)) {
		errors.push({
			code: DiagnosticCode.RESERVED_IDENTIFIER,
			message: `Graphical function identifier '${id}' uses the reserved prefix '${RESERVED_LOOKUP_PREFIX}'`,
			span: graphicalFunctionDecl.idSpan,
		});
	}
}

function formatDecimal(value: number): string {
	const plain = String(value);
	if (!plain.includes("e")) return plain;
	if (Number.isInteger(value)) return BigInt(value).toString();
	return value.toFixed(20).replace(/0+$/, "").replace(/\.$/, "");
}

function snapSaveStepToStepMultiple(
	saveStep: number,
	step: number,
	timeDecl: TimeDeclarationNode,
	nonFatalDiagnostics: WarningDiagnostic[],
): number {
	const ratio = saveStep / step;
	const nearest = Math.round(ratio);
	const snapped = parseFloat((nearest * step).toPrecision(12));
	if (Math.abs(ratio - nearest) > 1e-12 * Math.max(1, Math.abs(ratio))) {
		nonFatalDiagnostics.push({
			code: DiagnosticCode.SAVE_STEP_NOT_MULTIPLE,
			message: `time.save_step (${formatDecimal(saveStep)}) is not a multiple of time.step (${formatDecimal(step)}); saving every ${formatDecimal(snapped)} (${nearest} * step)`,
			span: timeDecl.span,
			severity: "warning",
		});
	}
	return snapped;
}

function compileTimeBlock(
	timeDecl: TimeDeclarationNode,
	errors: IRDiagnostic[],
	nonFatalDiagnostics: WarningDiagnostic[],
): IRTime {
	const findTimePropertyValue = (
		key: "start" | "end" | "step" | "save_step",
	): number | null => {
		const prop = timeDecl.props.find((timeProp) => timeProp.key === key);
		if (!prop) return null;
		const value = parseFloat(prop.value.value);
		if (!Number.isFinite(value)) {
			errors.push({
				code: DiagnosticCode.NON_FINITE_TIME_VALUE,
				message: `time.${key} must be a finite number (got ${value})`,
				span: timeDecl.span,
			});
			return null;
		}
		return value;
	};

	const start = findTimePropertyValue("start");
	const end = findTimePropertyValue("end");
	const step = findTimePropertyValue("step");
	const saveStep = findTimePropertyValue("save_step");

	for (const key of ["start", "end", "step"] as const) {
		if (!timeDecl.props.some((timeProp) => timeProp.key === key)) {
			errors.push({
				code: DiagnosticCode.MISSING_TIME_PROPERTY,
				message: `time block is missing required property '${key}'`,
				span: timeDecl.span,
			});
		}
	}

	if (step !== null && step <= 0) {
		errors.push({
			code: DiagnosticCode.INVALID_TIME_STEP,
			message: `time.step must be greater than 0 (got ${step})`,
			span: timeDecl.span,
		});
	}
	if (start !== null && end !== null && end < start) {
		errors.push({
			code: DiagnosticCode.INVALID_TIME_RANGE,
			message: `time.end must be >= time.start (${end} < ${start})`,
			span: timeDecl.span,
		});
	}

	if (saveStep !== null && saveStep <= 0) {
		errors.push({
			code: DiagnosticCode.INVALID_SAVE_STEP,
			message: `time.save_step must be greater than 0 (got ${saveStep})`,
			span: timeDecl.span,
		});
	}
	if (saveStep !== null && saveStep > 0 && step !== null && saveStep < step) {
		errors.push({
			code: DiagnosticCode.INVALID_SAVE_STEP,
			message: `time.save_step must be >= time.step (${saveStep} < ${step})`,
			span: timeDecl.span,
		});
	}

	const effectiveSaveStep =
		saveStep !== null && step !== null && step > 0 && saveStep >= step
			? snapSaveStepToStepMultiple(
					saveStep,
					step,
					timeDecl,
					nonFatalDiagnostics,
				)
			: saveStep;

	return {
		start: start ?? 0,
		end: end ?? 0,
		step: step ?? 1,
		...(effectiveSaveStep !== null && { saveStep: effectiveSaveStep }),
		...(timeDecl.timeUnits !== undefined && {
			timeUnits: timeDecl.timeUnits.value,
		}),
	};
}

export function compileAST(ast: FileNode): CompileResult {
	const errors: IRDiagnostic[] = [];
	const nonFatalDiagnostics: WarningDiagnostic[] = [];

	// ── Collect typed decls ───────────────────────────────────────────────────

	const timeDecls = ast.decls.filter(isTimeDeclaration);
	const stockDecls = ast.decls.filter(isStockDeclaration);
	const auxDecls = ast.decls.filter(isAuxiliaryDeclaration);
	const flowDecls = ast.decls.filter(isFlowDeclaration);
	const connectionDecls = ast.decls.filter(isConnectionDeclaration);
	const graphicalFunctionDecls = ast.decls.filter(
		isGraphicalFunctionDeclaration,
	);

	// ── Multi-model rejection (B1) ────────────────────────────────────────────
	// v0.1 supports a single model per file. The grammar accepts model_decl+
	// (future-proofing for submodels); any extra model declaration here is
	// rejected with a diagnostic and ignored by the rest of the compile pass.
	// These are non-fatal: the entry model still compiles into the IR.
	for (const submodel of ast.submodels) {
		nonFatalDiagnostics.push({
			code: DiagnosticCode.MULTI_MODEL_NOT_SUPPORTED,
			message: `Multi-model files are not supported in v0.1 (submodel '${submodel.id}'). Only the entry model declaration is compiled.`,
			span: submodel.span,
			severity: "warning",
		});
	}

	// ── Structural validation ─────────────────────────────────────────────────

	const isSimulatable = ast.model.kind === "sfd";

	if (isSimulatable && timeDecls.length === 0)
		errors.push({
			code: DiagnosticCode.MISSING_TIME_BLOCK,
			message: "Missing required time block",
		});
	// Two time blocks are invalid for both kinds — even a CLD that never
	// simulates cannot meaningfully declare time twice.
	if (timeDecls.length > 1)
		errors.push({
			code: DiagnosticCode.DUPLICATE_TIME_BLOCK,
			message: "Only one time block is allowed",
			span: timeDecls[1].span,
		});
	if (isSimulatable && stockDecls.length === 0)
		errors.push({
			code: DiagnosticCode.MISSING_STOCK,
			message: "At least one stock is required",
		});

	if (!isSimulatable) {
		timeDecls.forEach((timeDecl) =>
			errors.push({
				code: DiagnosticCode.SFD_ONLY_DECLARATION,
				message:
					"time block is not allowed in cld models; a cld is not simulated",
				span: timeDecl.span,
			}),
		);
		stockDecls.forEach((stockDecl) =>
			errors.push({
				code: DiagnosticCode.SFD_ONLY_DECLARATION,
				message: `stock '${stockDecl.id}' is not allowed in cld models; a cld describes causal structure only — use an sfd model for stocks and flows`,
				span: stockDecl.span,
			}),
		);
		flowDecls.forEach((flowDecl) =>
			errors.push({
				code: DiagnosticCode.SFD_ONLY_DECLARATION,
				message: `flow '${flowDecl.id}' is not allowed in cld models; a cld describes causal structure only — use an sfd model for stocks and flows`,
				span: flowDecl.span,
			}),
		);
		graphicalFunctionDecls.forEach((graphicalFunctionDecl) =>
			errors.push({
				code: DiagnosticCode.SFD_ONLY_DECLARATION,
				message: `gf '${graphicalFunctionDecl.id}' is not allowed in cld models; graphical functions belong to sfd equations`,
				span: graphicalFunctionDecl.span,
			}),
		);
	}

	// ── Duplicate ID check ────────────────────────────────────────────────────

	const allIdDecls: Array<{ id: string; span: Span }> = [
		...stockDecls.map((stockDecl) => ({
			id: stockDecl.id,
			span: stockDecl.idSpan,
		})),
		...auxDecls.map((auxDecl) => ({ id: auxDecl.id, span: auxDecl.idSpan })),
		...flowDecls.map((flowDecl) => ({
			id: flowDecl.id,
			span: flowDecl.idSpan,
		})),
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

	// ── Builtin-shadow check (B4.1) ───────────────────────────────────────────
	// A variable identifier (stock / flow / aux) may not collide with a builtin
	// function name. Builtins are case-insensitive (per `stdlib.md` "Case
	// handling"), so the comparison uppercases the user identifier before
	// looking it up in BUILTIN_FUNCTIONS.
	for (const { id, span } of allIdDecls) {
		if (BUILTIN_FUNCTIONS.has(id.toUpperCase())) {
			errors.push({
				code: DiagnosticCode.IDENTIFIER_SHADOWS_BUILTIN,
				message: `Variable identifier '${id}' shadows builtin function '${id.toUpperCase()}'`,
				span,
			});
		}
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
		validateGraphicalFunctionIdentifier(graphicalFunctionDecl, errors);
	}

	// ── Time ──────────────────────────────────────────────────────────────────

	const timeDecl = timeDecls[0];
	const time = timeDecl
		? compileTimeBlock(timeDecl, errors, nonFatalDiagnostics)
		: { start: 0, end: 0, step: 1 };

	// ── Build valid ID set ────────────────────────────────────────────────────

	const validIds = new Set<string>([
		...stockDecls.map((stockDecl) => stockDecl.id),
		...auxDecls.map((auxDecl) => auxDecl.id),
		...flowDecls.map((flowDecl) => flowDecl.id),
	]);

	const graphicalFunctionNames = new Set<string>(
		graphicalFunctionDecls.map(
			(graphicalFunctionDecl) => graphicalFunctionDecl.id,
		),
	);

	// ── Validate and build IRGraphicalFunction list ───────────────────────────

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
		const initProp = stockDecl.props.find(
			(prop) => prop.type === "StockProperty",
		);
		if (!initProp) {
			errors.push({
				code: DiagnosticCode.MISSING_STOCK_INIT,
				message: `Stock '${stockDecl.id}' is missing init`,
				span: stockDecl.span,
			});
			return {
				id: stockDecl.id,
				init: { type: "Number", value: 0 },
				position: posToIR(stockDecl.position),
			};
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

	const auxiliaries: IRAuxiliary[] = auxDecls.map((auxDecl) => {
		if (!auxDecl.expr) {
			if (ast.model.kind === "sfd") {
				errors.push({
					code: DiagnosticCode.AUX_MISSING_EXPRESSION,
					message: `aux '${auxDecl.id}' requires an expression in sfd models`,
					span: auxDecl.span,
				});
			}
			return { id: auxDecl.id, position: posToIR(auxDecl.position) };
		}
		if (ast.model.kind === "cld") {
			errors.push({
				code: DiagnosticCode.AUX_EXPRESSION_IN_CLD,
				message: `aux '${auxDecl.id}' cannot have an expression in cld models; cld variables carry structure only — use an sfd model for equations`,
				span: auxDecl.span,
			});
			return { id: auxDecl.id, position: posToIR(auxDecl.position) };
		}
		return {
			id: auxDecl.id,
			expr: compileExpr(
				auxDecl.expr,
				validIds,
				graphicalFunctionNames,
				errors,
				syntheticGraphicalFunctions,
			),
			position: posToIR(auxDecl.position),
		};
	});

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

	const connections = connectionDecls.map((connectionDecl) => {
		if (
			connectionDecl.angle !== undefined &&
			Math.abs(connectionDecl.angle) > 180
		) {
			nonFatalDiagnostics.push({
				code: DiagnosticCode.CONNECTION_ANGLE_OUT_OF_RANGE,
				message: `Connection '${connectionDecl.from}' -> '${connectionDecl.to}' has angle ${connectionDecl.angle}, outside -180..180; the renderer clamps it`,
				span: connectionDecl.span,
				severity: "warning",
			});
		}
		return {
			from: connectionDecl.from,
			polarity: connectionDecl.polarity,
			to: connectionDecl.to,
			angle: connectionDecl.angle,
			via: connectionDecl.via
				? { x: connectionDecl.via.x, y: connectionDecl.via.y }
				: undefined,
		};
	});

	// ── Emit ──────────────────────────────────────────────────────────────────

	if (errors.length > 0) {
		return { ir: null, diagnostics: [...nonFatalDiagnostics, ...errors] };
	}

	const ir: IR = {
		ir_version: "0.1",
		model: { id: ast.model.id, kind: ast.model.kind },
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
