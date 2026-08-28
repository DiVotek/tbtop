import { createContext, type ReactNode, useContext, useMemo, useRef } from "react";
import { safeUuid } from "../lib/safeUuid";

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

interface StackEntry {
	id: string;
	close: () => void;
}

export function ModalStackProvider({ children }: { children: ReactNode }) {
	const entries = useRef<StackEntry[]>([]);
	const value = useMemo<ModalStack>(
		() => ({
			push: (close) => {
				const id = safeUuid();
				entries.current.push({ id, close });
				return () => {
					entries.current = entries.current.filter((entry) => entry.id !== id);
				};
			},
			// Pop before invoking: two closeModal effects delivered in one
			// synchronous payload must each close a distinct modal, not hit
			// the same (still-registered) top twice.
			closeTop: () => {
				const top = entries.current.at(-1);
				if (!top) {
					return false;
				}
				entries.current = entries.current.slice(0, -1);
				top.close();
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
