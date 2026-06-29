import { useEffect, useRef, useState } from "react";
import type { ClientActionContext } from "../structure/types";

type SearchState =
	| { kind: "loading" }
	| { kind: "ready"; rows: unknown[] }
	| { kind: "error"; message: string };

type QueryFn = (ctx: ClientActionContext, search: string) => Promise<unknown[]>;

export interface AsyncSearchArgs {
	ctx: ClientActionContext;
	query: QueryFn | undefined;
	search: string;
	/** Bump to force a refetch with the same search (e.g. after create, or deps change). */
	refetchKey?: number | string;
}

export function useAsyncSearch({
	ctx,
	query,
	search,
	refetchKey = 0,
}: AsyncSearchArgs): SearchState {
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;
	const queryRef = useRef(query);
	queryRef.current = query;
	const hasQuery = query !== undefined;
	const [state, setState] = useState<SearchState>(() =>
		hasQuery ? { kind: "loading" } : { kind: "ready", rows: [] },
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: hasQuery/refetchKey trigger refetch
	useEffect(() => {
		const fn = queryRef.current;
		if (!fn) {
			setState({ kind: "ready", rows: [] });
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
	}, [hasQuery, search, refetchKey]);
	return state;
}
