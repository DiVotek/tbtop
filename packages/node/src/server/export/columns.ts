import type { Column, Row, TableBuilder } from "../../dsl";
import { unprocessable } from "../http";
import { projectRows } from "../projection";
import { dataGet } from "../validation/data";
import { type Cell, exportCell } from "./cell";

/** The table's visible value columns; a group contributes its children. */
function candidates(table: TableBuilder): Column[] {
	return table
		.visibleColumns()
		.flatMap((c) => (c.groupColumns().length > 0 ? c.groupColumns() : [c]));
}

/** Which columns an export writes: the request's columns[] in declared order, else the enabled ones. */
export function resolveExportColumns(table: TableBuilder, requested: unknown): Column[] {
	const all = candidates(table);
	if (!Array.isArray(requested)) {
		const enabled = all.filter((c) => c.st.export?.enabled !== false);
		return enabled.length > 0 ? enabled : all;
	}
	const names = new Set(requested.filter((n): n is string => typeof n === "string"));
	const picked = all.filter((c) => names.has(c.name));
	if (picked.length === 0) {
		throw unprocessable("None of the requested columns can be exported.");
	}
	return picked;
}

export function exportHeaders(columns: Column[]): string[] {
	return columns.map((c) => c.st.export?.label ?? c.st.label ?? c.name);
}

export interface ExportTarget {
	table: TableBuilder;
	columns: Column[];
	keyName: string;
}

/** One list of cells per row: export({as}) when set, else the projected screen value. */
export function exportCells({ table, columns, keyName }: ExportTarget, rows: Row[]): Cell[][] {
	const projected = projectRows(table, rows, keyName);
	return rows.map((row, i) =>
		columns.map((column) => {
			const as = column.st.export?.as;
			const value = as
				? as(dataGet(row, column.name), row)
				: dataGet(projected[i] ?? {}, column.name);
			return exportCell(column, value);
		}),
	);
}
