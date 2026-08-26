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
} {
	const [state, setState] = useState<AsyncState<T>>(() =>
		input.query ? { kind: "loading" } : { kind: "loaded", data: undefined as T },
	);
	const [tick, setTick] = useState(0);

	const refetch = useCallback(() => setTick((t) => t + 1), []);

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
		// Keep previous data visible during reload — only go to `loading` on first fetch.
		setState((prev) => {
			if (prev.kind === "loaded" || prev.kind === "reloading") {
				return { kind: "reloading", data: prev.data };
			}
			return { kind: "loading" };
		});
		void run(() => queryFn(ctxRef.current), {
			onResult: (data) => setState({ kind: "loaded", data }),
			onError: (err) => setState({ kind: "error", message: extractMessage(err) }),
		});
		return () => {
			run.cancel();
		};
	}, [queryFn, tick, run, ...deps]);
	// oxlint-enable react-hooks/exhaustive-deps

	return { state, refetch };
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
