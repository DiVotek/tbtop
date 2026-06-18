import { createContext, type ReactNode, useContext } from "react";

/**
 * Data fetched by a modal's backend query, exposed to the modal body. A form
 * (or any body) reads it via useModalData to prefill from per-open data instead
 * of the page-static record. Absent → no modal query was declared.
 */
const ModalDataContext = createContext<unknown>(undefined);

export function ModalDataProvider({ value, children }: { value: unknown; children: ReactNode }) {
	return <ModalDataContext.Provider value={value}>{children}</ModalDataContext.Provider>;
}

/** Returns the fetched modal data, or undefined when outside a data modal. */
export function useModalData(): unknown {
	return useContext(ModalDataContext);
}
