import { createContext, type ReactNode, useContext, useEffect } from "react";
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

/**
 * Mounted table controllers keyed by name, so refreshTable can reach a table
 * even when the effect runs outside its provider subtree (e.g. a page-level
 * header action, which useNearestTableController can never see).
 */
const mountedTables = new Map<string, TableController>();

export function getRegisteredTableController(name: string): TableController | undefined {
	return mountedTables.get(name);
}

export function getAllRegisteredTableControllers(): TableController[] {
	return [...mountedTables.values()];
}

/** Registers `controller` under `name` for the component's lifetime; unnamed tables are not registered (nothing to key them by). */
export function useRegisterTableController(name: string, controller: TableController): void {
	useEffect(() => {
		if (!name) {
			return;
		}
		mountedTables.set(name, controller);
		return () => {
			mountedTables.delete(name);
		};
	}, [name, controller]);
}
