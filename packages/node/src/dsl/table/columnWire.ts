import { toConstraints } from "../rules";
import type { Column, ColumnState } from "./column";

const FLAGS = ["emphasized", "muted", "uppercase", "translatable"] as const;

/** Sparse wire shape of a column: only what was set (Column::jsonSerialize). */
export function columnWire(column: Column): Record<string, unknown> {
	const st = column.st;
	const out: Record<string, unknown> = { name: column.name };
	copyDefined(out, st, ["label", "kind", "sortable", "searchable"]);
	if (st.individuallySearchable !== undefined) {
		out.columnSearchable = st.individuallySearchable;
	}
	if (st.toggleable !== undefined) {
		out.toggleable = st.toggleable;
		if (st.hiddenByDefault) {
			out.hiddenByDefault = true;
		}
	}
	copyDefined(out, st, ["align", "icon", "width"]);
	if (st.sticky === true) {
		out.sticky = true;
	}
	copyDefined(out, st, ["wrap"]);
	if (st.noWrap === true) {
		out.noWrap = true;
	}
	copyDefined(out, st, ["tooltip", "description"]);
	for (const flag of FLAGS) {
		if (st[flag] === true) {
			out[flag] = true;
		}
	}
	if (st.copyable !== undefined) {
		out.copyable = st.copyable;
	}
	Object.assign(out, st.kindMeta, st.affixes);
	if (st.kind === "group") {
		assertGroupSerializable(column);
		out.columns = st.groupColumns.map(columnWire);
	}
	const editable = editableWire(column);
	if (editable !== null) {
		out.editable = editable;
	}
	return out;
}

function copyDefined(
	out: Record<string, unknown>,
	st: ColumnState,
	keys: readonly (keyof ColumnState)[],
): void {
	for (const key of keys) {
		if (st[key] !== undefined) {
			out[key] = st[key];
		}
	}
}

function editableWire(column: Column): Record<string, unknown> | null {
	const st = column.st;
	if (Object.keys(st.editInput).length > 0 && st.editAs === undefined) {
		throw new Error(`Column "${column.name}": step() requires numberInput().`);
	}
	if (st.editAs === undefined) {
		return null;
	}
	if (st.formatUsing !== undefined) {
		throw new Error(
			`Column "${column.name}": formatting an inline-editable cell is unsupported, use affixes (prefix/suffix) instead.`,
		);
	}
	const editable: Record<string, unknown> = { as: st.editAs };
	const constraints = toConstraints(st.editRules);
	if (Object.keys(constraints).length > 0) {
		editable.constraints = constraints;
	}
	if (st.editOptions.length > 0) {
		editable.options = st.editOptions;
	}
	if (Object.keys(st.editInput).length > 0) {
		editable.input = st.editInput;
	}
	return editable;
}

function assertGroupSerializable(column: Column): void {
	const fail = (message: string) => {
		throw new Error(`Column "${column.name}": ${message}`);
	};
	if (column.st.groupColumns.length === 0) {
		fail("group() requires at least one child column.");
	}
	if (column.st.copyable !== undefined) {
		fail("copyable() is not supported on a group column.");
	}
	if (column.isEditable()) {
		fail("editable is not supported on a group column.");
	}
	if (column.isSortable()) {
		fail("sortable() is not supported on a group column — put it on a child.");
	}
	if (column.isIndividuallySearchable()) {
		fail("individuallySearchable() is not supported on a group column — put it on a child.");
	}
	column.st.groupColumns.forEach(assertGroupChild);
}

function assertGroupChild(child: Column): void {
	const fail = (message: string) => {
		throw new Error(`Column "${child.name}": ${message}`);
	};
	if (child.st.kind === "group" || child.groupColumns().length > 0) {
		fail("nested group is not supported.");
	}
	if (child.isEditable()) {
		fail("editable is not supported inside a group.");
	}
	if (child.isIndividuallySearchable()) {
		fail("individuallySearchable() is not supported inside a group.");
	}
	if (child.isSortable()) {
		fail("sortable() inside a group is not implemented yet.");
	}
	if (child.isTranslatable()) {
		fail("translatable() inside a group is not implemented yet.");
	}
}
