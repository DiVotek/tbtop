import { createContext, type ReactNode, useContext } from "react";
import type { TableController } from "./types";

const TableCtx = createContext<TableController | null>(null);

export function TableControllerProvider({
	value,
	children,
}: {
	value: TableController;
	children: ReactNode;
}) {
	return <TableCtx.Provider value={value}>{children}</TableCtx.Provider>;
}

export function useNearestTableController(): TableController | null {
	return useContext(TableCtx);
}
