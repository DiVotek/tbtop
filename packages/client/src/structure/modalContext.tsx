import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { ModalController, NotificationConfig } from "./types";

const ModalCtx = createContext<ModalController | null>(null);

export function ModalProvider({
	close,
	halt,
	parent,
	children,
}: {
	close: () => void;
	halt?: (message: string, level?: NotificationConfig["kind"]) => void;
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
			halt,
		}),
		[close, halt, parent],
	);
	return <ModalCtx.Provider value={value}>{children}</ModalCtx.Provider>;
}

export function useNearestModal(): ModalController | null {
	return useContext(ModalCtx);
}
