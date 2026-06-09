import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { ModalController } from "./types";

const ModalCtx = createContext<ModalController | null>(null);

export function ModalProvider({
	close,
	parent,
	children,
}: {
	close: () => void;
	parent: ModalController | null;
	children: ReactNode;
}) {
	const value = useMemo<ModalController>(
		() => ({
			close,
			closeAll: () => {
				close();
				parent?.closeAll();
			},
		}),
		[close, parent],
	);
	return <ModalCtx.Provider value={value}>{children}</ModalCtx.Provider>;
}

export function useNearestModal(): ModalController | null {
	return useContext(ModalCtx);
}
