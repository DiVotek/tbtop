import { applyKindFormat, type Column, type Row, type TableBuilder } from "../dsl";
import { phpString } from "../dsl/options";
import { pickTranslation } from "./translatable";
import { dataGet, dataSet } from "./validation/data";

/**
 * Rows as the client receives them (ColumnProjection.php): an allowlist of
 * the record key and the visible declared columns, formatted server-side.
 */
export function projectRows(table: TableBuilder, rows: Row[], keyName: string): Row[] {
	const columns = table.visibleColumns();
	const values = columns.flatMap((c) => (c.groupColumns().length > 0 ? c.groupColumns() : [c]));
	const meta = columns.flatMap((c) => [c, ...c.groupColumns()]);
	const recordUrl = table.recordUrlResolver();
	const groups = table.getGroupsColumn();
	return rows.map((row) => {
		const out = projectRow(row, values, keyName);
		if (groups !== null && dataGet(out, groups) === null) {
			dataSet(out, groups, dataGet(row, groups));
		}
		if (recordUrl !== undefined) {
			out._recordUrl = recordUrl(row);
		}
		attachResolved(
			out,
			"_tooltips",
			resolved(meta, row, (c) => c.st.tooltipFn),
		);
		attachResolved(
			out,
			"_descriptions",
			resolved(meta, row, (c) => c.st.descriptionFn),
		);
		return out;
	});
}

function projectRow(row: Row, columns: Column[], keyName: string): Row {
	const out: Row = {};
	const key = row[keyName];
	if (key !== undefined && key !== null) {
		out[keyName] = key;
		out._key = key;
	}
	for (const col of columns) {
		const link = col.st.linkFn;
		dataSet(out, col.name, link ? link(row) : computeValue(col, dataGet(row, col.name), row));
	}
	return out;
}

/** translatable → formatUsing → declarative kind format; editable cells stay raw. */
function computeValue(col: Column, raw: unknown, row: Row): unknown {
	const value = col.isTranslatable() ? pickTranslation(raw) : raw;
	if (col.isEditable()) {
		return value;
	}
	if (col.st.formatUsing !== undefined) {
		return col.st.formatUsing(value, row);
	}
	return applyKindFormat(col.st.kind ?? "", col.st.kindMeta, value);
}

function resolved(
	columns: Column[],
	row: Row,
	pick: (c: Column) => ((row: Row) => unknown) | undefined,
): Row {
	const out: Row = {};
	for (const col of columns) {
		const value = pick(col)?.(row);
		if (
			(typeof value === "string" && value !== "") ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			out[col.name] = phpString(value);
		}
	}
	return out;
}

function attachResolved(target: Row, key: string, values: Row): void {
	if (Object.keys(values).length > 0) {
		target[key] = values;
	}
}
