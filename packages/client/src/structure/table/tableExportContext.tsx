import { createContext, type ReactNode, useContext } from "react";
import type { TableColumn } from "../types";

export interface TableExportTarget {
	tableName: string;
	columns: TableColumn[];
	/** The export endpoint for an ExportAction of this table. */
	exportUrl: (action: string) => string;
}

const TableExportCtx = createContext<TableExportTarget | null>(null);

/** Lets an export dialog opened from this table's header or bulk actions reach its columns and endpoint. */
export function TableExportProvider({
	value,
	children,
}: {
	value: TableExportTarget | null;
	children: ReactNode;
}) {
	return <TableExportCtx.Provider value={value}>{children}</TableExportCtx.Provider>;
}

export function useTableExportTarget(): TableExportTarget | null {
	return useContext(TableExportCtx);
}
