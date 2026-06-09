import { router } from "@inertiajs/react";
import { useCallback } from "react";

export type NavigateFn = (path: string | number) => void;

// Drop-in shim for react-router's useNavigate: string paths go through the
// Inertia router, numeric deltas fall back to browser history.
export function useNavigate(): NavigateFn {
	return useCallback((path: string | number) => {
		if (typeof path === "number") {
			window.history.go(path);
			return;
		}
		router.visit(path);
	}, []);
}
