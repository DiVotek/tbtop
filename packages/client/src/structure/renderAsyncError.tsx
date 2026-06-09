import type { ReactNode } from "react";

type ErrorSlot = ReactNode | ((err: Error) => ReactNode);

export function renderAsyncError(
	slot: ErrorSlot | undefined,
	message: string,
	fallback: ReactNode,
): ReactNode {
	if (slot === undefined) {
		return fallback;
	}
	if (typeof slot === "function") {
		return slot(new Error(message));
	}
	return slot;
}
