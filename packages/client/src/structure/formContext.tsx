import { createContext, type ReactNode, useContext } from "react";
import type { FormControllerInternal } from "./formController";
import type { FormController } from "./types";

const FormCtx = createContext<FormControllerInternal | null>(null);

export function FormControllerProvider({
	value,
	children,
}: {
	value: FormControllerInternal;
	children: ReactNode;
}) {
	return <FormCtx.Provider value={value}>{children}</FormCtx.Provider>;
}

/** Internal accessor: render machinery that needs error/touched plumbing. */
export function useNearestFormHandle(): FormControllerInternal | null {
	return useContext(FormCtx);
}

/**
 * The nearest enclosing form, narrowed to the stable FormController surface.
 * This is the public extension point for form-aware custom blocks.
 */
export function useNearestFormController(): FormController | null {
	return useContext(FormCtx);
}
