import { useEffect, useRef } from "react";
import { hasValue, readDeps } from "../fields/fieldDependencies";
import { useReconciled } from "../lib/useReconciled";
import { readPath, writePath } from "./dependentFieldPath";
import { collectDependentFields, type DependentDeclaration } from "./dependentFields";
import { reconcileShiftedRows, trackRepeaterRows } from "./dependentRowTracking";
import type { FormControllerInternal } from "./formController";
import { isEqual } from "./formController";
import type { StructureNode } from "./types";

type Bag = Record<string, unknown>;

/**
 * Form-level replacement for the old per-field reset effect
 * (fieldDependencies.ts's former useDependentReset). A field's own effect
 * only runs while it is mounted, so a field hidden by a condition never saw
 * its parent change and kept a now-invalid value that still reached submit.
 * Tracking every declared dependent field from the form root, keyed by data
 * path, fixes that — mount state no longer matters.
 *
 * Declarations are recomputed from the current tree/data every render (a
 * repeater's rows come and go), but each path's "did the parent change"
 * check is keyed off a ref map that survives across renders regardless of
 * whether that field is currently rendered.
 */
export function useDependentResets(tree: StructureNode[], ctrl: FormControllerInternal): void {
	const prevKeysRef = useRef<Map<string, string>>(new Map());
	const prevRowsRef = useRef<Map<string, unknown[]>>(new Map());
	const seededRef = useRef(false);

	// A record reset/reload must reseed rather than read the incoming record as
	// a cascade of parent changes — reseed whenever `initial` actually changes.
	const initialSync = useReconciled(ctrl.initial);

	// oxlint-disable react-hooks/exhaustive-deps -- ctrl is a fresh object every render
	useEffect(() => {
		if (initialSync.changed) {
			initialSync.accept();
			seededRef.current = false;
			prevKeysRef.current = new Map();
			prevRowsRef.current = new Map();
		}

		const declarations = collectDependentFields(wrapRoot(tree), ctrl.data);
		const prevKeys = prevKeysRef.current;

		if (!seededRef.current) {
			seedPrevKeys(declarations, ctrl.data, prevKeys);
			trackRepeaterRows(declarations, ctrl.data, prevRowsRef.current);
			seededRef.current = true;
			return;
		}

		// A row shift (remove, move) changes which row sits at an index without
		// any parent field actually changing for that row — reseed those
		// declarations from current data instead of letting them reset below.
		const shifted = reconcileShiftedRows({
			declarations,
			data: ctrl.data,
			prevKeys,
			prevRows: prevRowsRef.current,
			depsKeyFor,
		});

		const next = applyResets({
			declarations: declarations.filter((decl) => !shifted.has(decl.path)),
			data: ctrl.data,
			initial: ctrl.initial,
			prevKeys,
		});
		if (next !== ctrl.data) {
			ctrl.setMany(() => next);
		}
	}, [tree, ctrl.data, initialSync]);
	// oxlint-enable react-hooks/exhaustive-deps
}

function wrapRoot(children: StructureNode[]): StructureNode {
	return { kind: "__root", options: { children }, meta: {} };
}

function seedPrevKeys(
	declarations: DependentDeclaration[],
	data: Bag,
	prevKeys: Map<string, string>,
): void {
	for (const decl of declarations) {
		prevKeys.set(decl.path, depsKeyFor(decl, data));
	}
}

interface ApplyResetsArgs {
	declarations: DependentDeclaration[];
	data: Bag;
	initial: Bag;
	prevKeys: Map<string, string>;
}

/**
 * Applies every declaration's reset rule against a single draft, iterating
 * to a fixed point so a cascade (type → car_id → period_id) lands in one
 * commit: clearing car_id in pass 1 changes period_id's own deps key, which
 * pass 2 then sees and clears in turn.
 */
function applyResets(args: ApplyResetsArgs): Bag {
	const { declarations, initial, prevKeys } = args;
	let draft = args.data;
	const cap = declarations.length + 1;
	for (let pass = 0; pass < cap; pass++) {
		const before = draft;
		for (const decl of declarations) {
			draft = resetOne({ decl, draft, initial, prevKeys });
		}
		if (draft === before) {
			break;
		}
	}
	return draft;
}

interface ResetOneArgs {
	decl: DependentDeclaration;
	draft: Bag;
	initial: Bag;
	prevKeys: Map<string, string>;
}

/**
 * Clears one declaration's field when its resolved deps key changed since
 * last seen, mirroring the field-level rule this replaces: a parent landing
 * for the first time at exactly the record's own (parents, value) pair is
 * hydration, not a user change, so it is left alone.
 */
function resetOne(args: ResetOneArgs): Bag {
	const { decl, draft, initial, prevKeys } = args;
	const depsKey = depsKeyFor(decl, draft);
	const prevKey = prevKeys.get(decl.path);
	prevKeys.set(decl.path, depsKey);
	if (prevKey === undefined || prevKey === depsKey || decl.keepValue) {
		return draft;
	}
	const value = readPath(draft, decl.path);
	const initialKey = depsKeyFor(decl, initial);
	const initialValue = readPath(initial, decl.path);
	const atInitial = depsKey === initialKey && isEqual(value, initialValue);
	if (atInitial || !hasValue(value)) {
		return draft;
	}
	return writePath(draft, decl.path, null);
}

/**
 * Shares readDeps/readOne with useFieldDependencies so a locale-scoped
 * dependency ("title.en", read out of a translatable parent's {en, uk} map)
 * resolves the same way on both sides — a hand-rolled scope[name] read would
 * always see "" for a dotted name that isn't a literal flat key.
 */
function depsKeyFor(decl: DependentDeclaration, data: Bag): string {
	const scope = scopeFor(decl.path, data);
	return JSON.stringify(readDeps(decl.dependsOn, scope).deps);
}

/** The bag `dependsOn` names resolve against: the row for a repeater sub-field, else root. */
function scopeFor(path: string, data: Bag): Bag {
	const lastDot = path.lastIndexOf(".");
	if (lastDot === -1) {
		return data;
	}
	const parent = readPath(data, path.slice(0, lastDot));
	return isBag(parent) ? parent : {};
}

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
