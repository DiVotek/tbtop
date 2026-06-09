import { useEffect, useRef, useState } from "react";
import type { ClientActionContext } from "../structure/types";

export type SearchState =
	| { kind: "loading" }
	| { kind: "ready"; rows: unknown[] }
	| { kind: "error"; message: string };

type QueryFn = (ctx: ClientActionContext, search: string) => Promise<unknown[]>;

export function useAsyncSearch(
	ctx: ClientActionContext,
	query: QueryFn | undefined,
	search: string,
): SearchState {
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;
	const queryRef = useRef(query);
	queryRef.current = query;
	const hasQuery = query !== undefined;
	const [state, setState] = useState<SearchState>(() =>
		hasQuery ? { kind: "loading" } : { kind: "ready", rows: [] },
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: hasQuery triggers refetch
	useEffect(() => {
		const fn = queryRef.current;
		if (!fn) {
			return;
		}
		let cancelled = false;
		setState({ kind: "loading" });
		fn(ctxRef.current, search).then(
			(rows) => {
				if (!cancelled) {
					setState({ kind: "ready", rows });
				}
			},
			(err: unknown) => {
				if (cancelled) {
					return;
				}
				const message = err instanceof Error ? err.message : "Query failed";
				setState({ kind: "error", message });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [hasQuery, search]);
	return state;
}
