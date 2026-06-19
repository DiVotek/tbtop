import type { ConditionContext, ConditionFn } from "../structure/types";

// ---------------------------------------------------------------------------
// Wire AST types (what PHP serializes over the wire)
// ---------------------------------------------------------------------------

type FieldOp =
	| "eq"
	| "neq"
	| "in"
	| "notIn"
	| "empty"
	| "notEmpty"
	| "truthy"
	| "gt"
	| "gte"
	| "lt"
	| "lte";

type FieldCond = {
	op: FieldOp;
	field: string;
	value?: unknown;
};

type AllCond = { op: "all"; conds: ConditionAst[] };
type AnyCond = { op: "any"; conds: ConditionAst[] };
type NotCond = { op: "not"; cond: ConditionAst };
type ServerCond = { op: "server" };

export type ConditionAst = FieldCond | AllCond | AnyCond | NotCond | ServerCond;

// ---------------------------------------------------------------------------
// Public compiler
// ---------------------------------------------------------------------------

/**
 * Compiles a wire-format condition AST into a ConditionFn.
 * Unknown ops and the reserved `server` op are fail-open: the function
 * returns false (not hidden / not disabled) and emits a console.warn.
 */
export function compileCondition(ast: ConditionAst): ConditionFn {
	return (ctx) => evaluate(ast, ctx);
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

function evaluate(ast: ConditionAst, ctx: ConditionContext): boolean {
	if (isFieldCond(ast)) {
		return evalFieldOp(ast, ctx);
	}
	return evalCompositeOp(ast, ctx);
}

const FIELD_OPS = new Set<string>([
	"eq",
	"neq",
	"in",
	"notIn",
	"empty",
	"notEmpty",
	"truthy",
	"gt",
	"gte",
	"lt",
	"lte",
]);

function isFieldCond(ast: ConditionAst): ast is FieldCond {
	return FIELD_OPS.has(ast.op);
}

function evalFieldOp(ast: FieldCond, ctx: ConditionContext): boolean {
	const val = resolve(ctx, ast.field);
	switch (ast.op) {
		case "eq":
			return evalEq(val, ast.value);
		case "neq":
			return !evalEq(val, ast.value);
		case "in":
			return evalIn(val, ast.value as unknown[]);
		case "notIn":
			return !evalIn(val, ast.value as unknown[]);
		case "empty":
			return evalEmpty(val);
		case "notEmpty":
			return !evalEmpty(val);
		case "truthy":
			return Boolean(val);
		default:
			return evalNumericOp(ast, val);
	}
}

function evalNumericOp(ast: FieldCond, val: unknown): boolean {
	switch (ast.op) {
		case "gt":
			return evalNumeric(val, ast.value, (a, b) => a > b);
		case "gte":
			return evalNumeric(val, ast.value, (a, b) => a >= b);
		case "lt":
			return evalNumeric(val, ast.value, (a, b) => a < b);
		case "lte":
			return evalNumeric(val, ast.value, (a, b) => a <= b);
		default:
			return false;
	}
}

function evalCompositeOp(
	ast: AllCond | AnyCond | NotCond | ServerCond,
	ctx: ConditionContext,
): boolean {
	switch (ast.op) {
		case "all":
			return (ast as AllCond).conds.every((c) => evaluate(c, ctx));
		case "any":
			return (ast as AnyCond).conds.some((c) => evaluate(c, ctx));
		case "not":
			return !evaluate((ast as NotCond).cond, ctx);
		case "server":
			console.warn(
				"[tabletop] server-eval condition received on client — treating as false (not hidden/disabled)",
			);
			return false;
		default: {
			const op = (ast as { op: string }).op;
			console.warn(
				`[tabletop] unknown condition op "${op}" — treating as false (not hidden/disabled)`,
			);
			return false;
		}
	}
}

// ---------------------------------------------------------------------------
// Field resolution: flat key first, then dotted-path traversal
// $root. prefix → resolve against root scope (falls back to data when absent)
// $user. prefix → resolve against the current user (role-gated actions)
// ---------------------------------------------------------------------------

const ROOT_PREFIX = "$root.";
const USER_PREFIX = "$user.";

function resolve(ctx: ConditionContext, field: string): unknown {
	if (field.startsWith(ROOT_PREFIX)) {
		const stripped = field.slice(ROOT_PREFIX.length);
		const scope = ctx.root ?? ctx.data;
		return resolveInScope(scope, stripped);
	}
	if (field.startsWith(USER_PREFIX)) {
		const stripped = field.slice(USER_PREFIX.length);
		const scope = isObject(ctx.user) ? ctx.user : {};
		return resolveInScope(scope, stripped);
	}
	return resolveInScope(ctx.data, field);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

function resolveInScope(scope: Record<string, unknown>, field: string): unknown {
	if (field in scope) {
		return scope[field];
	}
	const parts = field.split(".");
	let current: unknown = scope;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

// ---------------------------------------------------------------------------
// Per-op helpers
// ---------------------------------------------------------------------------

function scalarEquals(a: unknown, b: unknown): boolean {
	return a === b || String(a) === String(b);
}

function evalEq(fieldVal: unknown, value: unknown): boolean {
	return scalarEquals(fieldVal, value);
}

function evalIn(fieldVal: unknown, list: unknown[]): boolean {
	return list.some((item) => scalarEquals(fieldVal, item));
}

function evalEmpty(fieldVal: unknown): boolean {
	if (fieldVal === null || fieldVal === undefined || fieldVal === "") {
		return true;
	}
	if (Array.isArray(fieldVal)) {
		return fieldVal.length === 0;
	}
	return false;
}

function evalNumeric(
	fieldVal: unknown,
	value: unknown,
	compare: (a: number, b: number) => boolean,
): boolean {
	const a = Number(fieldVal);
	const b = Number(value);
	if (Number.isNaN(a) || Number.isNaN(b)) {
		return false;
	}
	return compare(a, b);
}
