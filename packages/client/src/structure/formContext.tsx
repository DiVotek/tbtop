import { createContext, type ReactNode, useContext } from "react";
import type { useFormController } from "./formController";

type ControllerHandle = ReturnType<typeof useFormController>;

const FormCtx = createContext<ControllerHandle | null>(null);

export function FormControllerProvider({
	value,
	children,
}: {
	value: ControllerHandle;
	children: ReactNode;
}) {
	return <FormCtx.Provider value={value}>{children}</FormCtx.Provider>;
}

export function useNearestFormController(): ControllerHandle | null {
	return useContext(FormCtx);
}
