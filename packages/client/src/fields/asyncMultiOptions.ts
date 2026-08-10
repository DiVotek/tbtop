import { useEffect, useRef, useState } from "react";
import type { ClientActionContext } from "../structure/types";
import {
	type AsyncMultiOptionsBag,
	buildLabelMap,
	type OptionMap,
	type ResolvedState,
	warnMissingOnLoad,
} from "./asyncOptions";

export interface MultiResolveArgs {
	ctx: ClientActionContext;
	fieldName: string;
	value: string[] | null;
	opts: AsyncMultiOptionsBag;
}

// oxlint-disable-next-line max-lines-per-function -- hook: effect + refs can't split without breaking hook rules
export function useMultiResolvedLabels({
	ctx,
	fieldName,
	value,
	opts,
}: MultiResolveArgs): ResolvedState {
	const warnedRef = useRef(false);
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;
	const optsRef = useRef(opts);
	optsRef.current = opts;
	// A fresh array is a new identity every render, so the effect keys off this
	// JSON string instead of `value` itself and re-parses it when the key changes.
	const idsKey = JSON.stringify(value ?? []);
	const [state, setState] = useState<ResolvedState>(() =>
		idsKey === "[]" ? { kind: "ready", labels: {} } : { kind: "loading" },
	);
	// Shown labels survive an in-flight load so the chips don't blank. The response
	// still replaces the map: a row renamed server-side must win over the cache.
	const shownRef = useRef<OptionMap>({});
	if (state.kind === "ready") {
		shownRef.current = state.labels;
	}

	useEffect(() => {
		const ids: string[] = JSON.parse(idsKey);
		if (ids.length === 0) {
			setState({ kind: "ready", labels: {} });
			return;
		}
		const { onLoad } = optsRef.current;
		if (!onLoad) {
			warnMissingOnLoad(warnedRef, fieldName);
			setState({ kind: "ready", labels: {} });
			return;
		}
		let cancelled = false;
		const shown = shownRef.current;
		setState(
			Object.keys(shown).length === 0
				? { kind: "loading" }
				: { kind: "ready", labels: shown },
		);
		onLoad(ctxRef.current, ids).then(
			(rows) => {
				if (cancelled) {
					return;
				}
				setState({
					kind: "ready",
					labels: buildLabelMap(rows, optsRef.current),
				});
			},
			() => {
				if (!cancelled) {
					setState({ kind: "ready", labels: shown });
				}
			},
		);
		return () => {
			cancelled = true;
		};
	}, [idsKey, fieldName]);
	return state;
}
