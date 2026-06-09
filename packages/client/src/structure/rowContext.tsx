import { createContext, type ReactNode, useContext } from "react";

type Row = Record<string, unknown>;

const RowCtx = createContext<Row | null>(null);

export function RowProvider({ value, children }: { value: Row; children: ReactNode }) {
	return <RowCtx.Provider value={value}>{children}</RowCtx.Provider>;
}

export function useNearestRow(): Row | null {
	return useContext(RowCtx);
}
