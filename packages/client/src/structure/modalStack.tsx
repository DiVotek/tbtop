import { createContext, type ReactNode, useContext, useMemo, useRef } from "react";

/**
 * Page-level registry of open DSL modals in open order, so a dispatcher with no
 * render position (Inertia flash effects) can close the modal a submit came from.
 */
export interface ModalStack {
	/** Registers an open modal's close callback; returns the unregister. */
	push(close: () => void): () => void;
	/** Closes the most recently registered modal; false when none is open. */
	closeTop(): boolean;
}

const NOOP_STACK: ModalStack = {
	push: () => () => {},
	closeTop: () => false,
};

const ModalStackCtx = createContext<ModalStack>(NOOP_STACK);

export function ModalStackProvider({ children }: { children: ReactNode }) {
	const entries = useRef<Array<() => void>>([]);
	const value = useMemo<ModalStack>(
		() => ({
			push: (close) => {
				entries.current.push(close);
				return () => {
					entries.current = entries.current.filter((entry) => entry !== close);
				};
			},
			closeTop: () => {
				const top = entries.current.at(-1);
				if (!top) {
					return false;
				}
				top();
				return true;
			},
		}),
		[],
	);
	return <ModalStackCtx.Provider value={value}>{children}</ModalStackCtx.Provider>;
}

export function useModalStack(): ModalStack {
	return useContext(ModalStackCtx);
}
