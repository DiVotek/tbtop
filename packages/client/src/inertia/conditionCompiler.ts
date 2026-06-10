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
	switch (ast.op) {
		case "eq":
			return evalEq(resolve(ctx, ast.field), ast.value);
		case "neq":
			return !evalEq(resolve(ctx, ast.field), ast.value);
		case "in":
			return evalIn(resolve(ctx, ast.field), ast.value as unknown[]);
		case "notIn":
			return !evalIn(resolve(ctx, ast.field), ast.value as unknown[]);
		case "empty":
			return evalEmpty(resolve(ctx, ast.field));
		case "notEmpty":
			return !evalEmpty(resolve(ctx, ast.field));
		case "truthy":
			return Boolean(resolve(ctx, ast.field));
		case "gt":
			return evalNumeric(resolve(ctx, ast.field), ast.value, (a, b) => a > b);
		case "gte":
			return evalNumeric(resolve(ctx, ast.field), ast.value, (a, b) => a >= b);
		case "lt":
			return evalNumeric(resolve(ctx, ast.field), ast.value, (a, b) => a < b);
		case "lte":
			return evalNumeric(resolve(ctx, ast.field), ast.value, (a, b) => a <= b);
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
// ---------------------------------------------------------------------------

const ROOT_PREFIX = "$root.";

function resolve(ctx: ConditionContext, field: string): unknown {
	if (field.startsWith(ROOT_PREFIX)) {
		const stripped = field.slice(ROOT_PREFIX.length);
		const scope = ctx.root ?? ctx.data;
		return resolveInScope(scope, stripped);
	}
	return resolveInScope(ctx.data, field);
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
