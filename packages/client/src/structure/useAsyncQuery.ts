import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "../lib/useLatest";
import type { ClientActionContext } from "./types";

export type AsyncState<T> =
	| { kind: "loading" }
	| { kind: "loaded"; data: T }
	| { kind: "reloading"; data: T }
	| { kind: "error"; message: string };

interface UseAsyncQueryInput<T> {
	query: ((ctx: ClientActionContext) => Promise<T>) | undefined;
	ctx: ClientActionContext;
	deps?: unknown[];
}

export function useAsyncQuery<T>(input: UseAsyncQueryInput<T>): {
	state: AsyncState<T>;
	refetch: () => void;
	/**
	 * Background refetch (polling): previous data stays on screen with no
	 * `reloading` state, and a failure keeps it instead of switching to `error`.
	 */
	refetchSilently: () => void;
} {
	const [state, setState] = useState<AsyncState<T>>(() =>
		input.query ? { kind: "loading" } : { kind: "loaded", data: undefined as T },
	);
	const { tick, refetch, refetchSilently, takeSilent } = useRefetchTick();

	const ctxRef = useRef(input.ctx);
	ctxRef.current = input.ctx;
	const queryFn = input.query;
	const deps = input.deps ?? [];
	const run = useLatest();

	// oxlint-disable react-hooks/exhaustive-deps -- consumer deps spread is intentionally dynamic
	useEffect(() => {
		if (!queryFn) {
			return;
		}
		const silent = takeSilent();
		// Keep previous data visible during reload — only go to `loading` on first fetch.
		setState((prev) => {
			if (silent && prev.kind === "loaded") {
				return prev;
			}
			if (prev.kind === "loaded" || prev.kind === "reloading") {
				return { kind: "reloading", data: prev.data };
			}
			return { kind: "loading" };
		});
		void run(() => queryFn(ctxRef.current), {
			onResult: (data) => setState({ kind: "loaded", data }),
			onError: (err) =>
				setState((prev) =>
					silent && prev.kind === "loaded"
						? prev
						: { kind: "error", message: extractMessage(err) },
				),
		});
		return () => {
			run.cancel();
		};
	}, [queryFn, tick, run, ...deps]);
	// oxlint-enable react-hooks/exhaustive-deps

	return { state, refetch, refetchSilently };
}

/** Bumps a refetch tick and records whether the next run is a silent (poll) one. */
function useRefetchTick() {
	const [tick, setTick] = useState(0);
	const silentRef = useRef(false);
	const refetch = useCallback(() => {
		silentRef.current = false;
		setTick((t) => t + 1);
	}, []);
	const refetchSilently = useCallback(() => {
		silentRef.current = true;
		setTick((t) => t + 1);
	}, []);
	const takeSilent = useCallback(() => {
		const silent = silentRef.current;
		silentRef.current = false;
		return silent;
	}, []);
	return { tick, refetch, refetchSilently, takeSilent };
}

function extractMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === "string") {
		return err;
	}
	return "Query failed";
}
