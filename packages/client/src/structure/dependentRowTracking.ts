import { readPath } from "./dependentFieldPath";
import type { DependentDeclaration } from "./dependentFields";

type Bag = Record<string, unknown>;

/**
 * Detects a repeater row shift (remove, move) vs. an in-place row edit, so
 * useDependentResets can tell "row 1 became row 0" (no parent actually
 * changed for that row, don't reset) apart from "row 0's parent field was
 * edited" (do reset).
 *
 * Row identity comes from object reference, compared per index:
 * RepeaterForm/repeaterItems.ts replaces an edited row immutably
 * (`{...it, [subName]: next}`), so exactly one index's reference differs
 * from what was there before on an in-place edit. `removeItem` changes the
 * array length outright (caught below without needing identity at all).
 * `moveItem` swaps two indices' references while keeping the length the
 * same — two-or-more indices holding a different reference than they held
 * before at the same length means rows swapped position, not that a row's
 * data changed. A same-length comparison by set membership alone would miss
 * a move: both rows are still present in the array, just swapped, so
 * neither reads as "new".
 */
export function isStructuralRowChange(prevRows: unknown[] | undefined, rows: unknown[]): boolean {
	if (prevRows === undefined) {
		return false;
	}
	if (prevRows.length !== rows.length) {
		return true;
	}
	let changedIdentities = 0;
	for (let i = 0; i < rows.length; i++) {
		if (rows[i] !== prevRows[i]) {
			changedIdentities++;
		}
	}
	return changedIdentities >= 2;
}

/** Records each declared repeater's current rows array, keyed by the repeater's own path. */
export function trackRepeaterRows(
	declarations: DependentDeclaration[],
	data: Bag,
	prevRows: Map<string, unknown[]>,
): void {
	for (const repeaterPath of repeaterPathsOf(declarations)) {
		prevRows.set(repeaterPath, rowsAt(data, repeaterPath));
	}
}

function repeaterPathsOf(declarations: DependentDeclaration[]): Set<string> {
	const paths = new Set<string>();
	for (const decl of declarations) {
		if (decl.repeaterPath !== undefined) {
			paths.add(decl.repeaterPath);
		}
	}
	return paths;
}

function rowsAt(data: Bag, repeaterPath: string): unknown[] {
	const value = readPath(data, repeaterPath);
	return Array.isArray(value) ? value : [];
}

interface ReconcileShiftedRowsArgs {
	declarations: DependentDeclaration[];
	data: Bag;
	prevKeys: Map<string, string>;
	prevRows: Map<string, unknown[]>;
	depsKeyFor: (decl: DependentDeclaration, data: Bag) => string;
}

/**
 * For every repeater a declaration belongs to: if its rows shifted (remove,
 * move) since last seen, reseed the deps key of every declaration in that
 * repeater from current data — no reset for them this run, since the row at
 * their index didn't actually get a different parent value, it moved there.
 * Returns the set of declaration paths that were reseeded this way.
 */
export function reconcileShiftedRows(args: ReconcileShiftedRowsArgs): Set<string> {
	const { declarations, data, prevKeys, prevRows, depsKeyFor } = args;
	const shifted = new Set<string>();
	for (const repeaterPath of repeaterPathsOf(declarations)) {
		const rows = rowsAt(data, repeaterPath);
		const prev = prevRows.get(repeaterPath);
		prevRows.set(repeaterPath, rows);
		if (!isStructuralRowChange(prev, rows)) {
			continue;
		}
		reseedRepeater({ repeaterPath, declarations, data, prevKeys, depsKeyFor, shifted });
	}
	return shifted;
}

interface ReseedRepeaterArgs {
	repeaterPath: string;
	declarations: DependentDeclaration[];
	data: Bag;
	prevKeys: Map<string, string>;
	depsKeyFor: (decl: DependentDeclaration, data: Bag) => string;
	shifted: Set<string>;
}

function reseedRepeater(args: ReseedRepeaterArgs): void {
	const { repeaterPath, declarations, data, prevKeys, depsKeyFor, shifted } = args;
	for (const decl of declarations) {
		if (decl.repeaterPath !== repeaterPath) {
			continue;
		}
		prevKeys.set(decl.path, depsKeyFor(decl, data));
		shifted.add(decl.path);
	}
}
