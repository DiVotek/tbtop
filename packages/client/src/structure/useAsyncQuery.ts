import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientActionContext } from "./types";

export type AsyncState<T> =
	| { kind: "loading" }
	| { kind: "loaded"; data: T }
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

	// oxlint-disable react-hooks/exhaustive-deps -- consumer deps spread is intentionally dynamic
	useEffect(() => {
		if (!queryFn) {
			return;
		}
		let cancelled = false;
		setState({ kind: "loading" });
		queryFn(ctxRef.current).then(
			(data) => {
				if (!cancelled) {
					setState({ kind: "loaded", data });
				}
			},
			(err: unknown) => {
				if (cancelled) {
					return;
				}
				setState({ kind: "error", message: extractMessage(err) });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [queryFn, tick, ...deps]);
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
