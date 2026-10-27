import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	 * `reloading` state. Skipped while any fetch is in flight, so a slow query
	 * is never cancelled by the next tick. One failure keeps the data; a
	 * second in a row switches to `error`, so stale data never reads as live.
	 */
	refetchSilently: () => void;
} {
	const [state, setState] = useState<AsyncState<T>>(() =>
		input.query ? { kind: "loading" } : { kind: "loaded", data: undefined as T },
	);
	const ticks = useRefetchTicks();

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
		const silent = ticks.begin();
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
			onResult: (data) => {
				ticks.succeeded();
				setState({ kind: "loaded", data });
			},
			onError: (err) => {
				const keep = ticks.failed(silent);
				setState((prev) =>
					keep && prev.kind === "loaded"
						? prev
						: { kind: "error", message: extractMessage(err) },
				);
			},
		});
		return () => {
			ticks.ended();
			run.cancel();
		};
	}, [queryFn, ticks.tick, run, ...deps]);
	// oxlint-enable react-hooks/exhaustive-deps

	return { state, refetch: ticks.refetch, refetchSilently: ticks.refetchSilently };
}

/**
 * Refetch tick plus the bookkeeping a silent (poll) refetch needs: whether
 * the next run is silent, whether a fetch is in flight, and whether the last
 * silent run already failed once.
 */
function useRefetchTicks() {
	const [tick, setTick] = useState(0);
	const silentRef = useRef(false);
	const inFlightRef = useRef(false);
	const silentFailedRef = useRef(false);
	const refetch = useCallback(() => {
		silentRef.current = false;
		setTick((t) => t + 1);
	}, []);
	const refetchSilently = useCallback(() => {
		if (inFlightRef.current) {
			return;
		}
		silentRef.current = true;
		setTick((t) => t + 1);
	}, []);
	return useMemo(
		() => ({
			tick,
			refetch,
			refetchSilently,
			/** Marks a fetch in flight; returns whether it is a silent one. */
			begin: () => {
				inFlightRef.current = true;
				const silent = silentRef.current;
				silentRef.current = false;
				return silent;
			},
			succeeded: () => {
				inFlightRef.current = false;
				silentFailedRef.current = false;
			},
			/** True when the current data should stay: a first silent failure. */
			failed: (silent: boolean) => {
				inFlightRef.current = false;
				const keep = silent && !silentFailedRef.current;
				silentFailedRef.current = keep;
				return keep;
			},
			ended: () => {
				inFlightRef.current = false;
			},
		}),
		[tick, refetch, refetchSilently],
	);
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
