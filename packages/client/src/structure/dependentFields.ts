import { getBlockDescriptor } from "../render/blockRegistry";
import { structureChildren } from "./structureChildren";
import type { StructureNode } from "./types";

type Bag = Record<string, unknown>;

export interface DependentDeclaration {
	/** Dot-path into the form data bag — "car_id", or "items.0.car_id" for a repeater row. */
	path: string;
	dependsOn: string[];
	keepValue: boolean;
	/** The enclosing repeater's own path ("items"), absent for a root-level field. */
	repeaterPath?: string;
}

/**
 * Walks a form's structure for every field that declared `dependsOn`, so the
 * form-level reset (useDependentResets) can track it even while it is
 * unmounted (hidden by a condition, inside a collapsed row).
 *
 * A repeater's sub-fields are expanded once per row actually present in
 * `data` — row 3 of a 5-row repeater is a real, independently-resettable
 * dependent field, not a template. `dependsOn` on a repeater sub-field is
 * resolved row-relative only (against that row's own bag): no `$root.`-style
 * cross-scope convention exists for it anywhere in the codebase today (the
 * `$root.` prefix `conditionCompiler.ts` supports is for hidden/disabled
 * conditions, not for `dependsOn` names), so a sub-field can only depend on
 * a sibling field in the same row.
 */
export function collectDependentFields(tree: StructureNode, data: Bag): DependentDeclaration[] {
	const out: DependentDeclaration[] = [];
	collectInto(tree, { data, prefix: "", repeaterPath: undefined, out });
	return out;
}

interface Scope {
	data: Bag;
	prefix: string;
	/** The nearest enclosing repeater's own path — undefined outside any repeater. */
	repeaterPath: string | undefined;
	out: DependentDeclaration[];
}

function collectInto(node: StructureNode, scope: Scope): void {
	const { data, prefix, repeaterPath, out } = scope;
	const opts = (node.options as Bag | undefined) ?? {};
	const isField = getBlockDescriptor(node.kind)?.behavior === "field" && node.name !== undefined;
	if (!isField) {
		for (const child of structureChildren(opts)) {
			collectInto(child, scope);
		}
		return;
	}
	const dependsOn = asStringList(opts.dependsOn);
	const path = `${prefix}${node.name}`;
	if (dependsOn.length > 0) {
		out.push({ path, dependsOn, keepValue: opts.keepValue === true, repeaterPath });
	}
	if (node.kind !== "repeater") {
		return;
	}
	const subFields = Array.isArray(opts.fields) ? (opts.fields as StructureNode[]) : [];
	const rowsValue = data[node.name as string];
	const rows = Array.isArray(rowsValue) ? rowsValue : [];
	rows.forEach((row, index) => {
		const rowData = isBag(row) ? row : {};
		const rowScope: Scope = {
			data: rowData,
			prefix: `${path}.${index}.`,
			repeaterPath: path,
			out,
		};
		for (const sub of subFields) {
			collectInto(sub, rowScope);
		}
	});
}

function asStringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
