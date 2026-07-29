import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientActionContext } from "../structure/types";

export interface AsyncSingleOptionsBag {
	query?: (
		ctx: ClientActionContext,
		search: string,
		deps?: Record<string, string>,
	) => Promise<unknown[]>;
	onLoad?: (
		ctx: ClientActionContext,
		value: string,
		deps?: Record<string, string>,
	) => Promise<unknown>;
	optionLabel?: (row: unknown) => string;
	optionValue?: (row: unknown) => string;
}

export interface AsyncMultiOptionsBag {
	query?: (ctx: ClientActionContext, search: string) => Promise<unknown[]>;
	onLoad?: (ctx: ClientActionContext, values: string[]) => Promise<unknown[]>;
	optionLabel?: (row: unknown) => string;
	optionValue?: (row: unknown) => string;
}

interface LabelCache {
	key: number | string;
	labels: Record<string, string>;
}

type ResolvedState = { kind: "loading" } | { kind: "ready"; labels: Record<string, string> };

const ID_SEPARATOR = "";

export interface SingleResolveArgs {
	ctx: ClientActionContext;
	fieldName: string;
	value: string | null;
	opts: AsyncSingleOptionsBag;
	refetchKey?: number | string;
	/** Labels the caller already holds (e.g. rows from query()); never re-resolved. */
	knownLabels?: Record<string, string>;
}

/**
 * Labels accumulate across value changes so re-selecting a row the dropdown
 * already listed doesn't blank the control. The cache belongs to one
 * refetchKey: new deps can map the same id to a different row.
 */
function useLabelCache(refetchKey: number | string, state: ResolvedState): { current: LabelCache } {
	const cacheRef = useRef<LabelCache>({ key: refetchKey, labels: {} });
	if (cacheRef.current.key !== refetchKey) {
		cacheRef.current = { key: refetchKey, labels: {} };
	} else if (state.kind === "ready") {
		cacheRef.current.labels = state.labels;
	}
	return cacheRef;
}

// oxlint-disable-next-line max-lines-per-function -- hook: effect + refs can't split without breaking hook rules
export function useSingleResolvedLabel({
	ctx,
	fieldName,
	value,
	opts,
	refetchKey = 0,
	knownLabels,
}: SingleResolveArgs): ResolvedState {
	const warnedRef = useRef(false);
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;
	const optsRef = useRef(opts);
	optsRef.current = opts;
	const id = value ?? "";
	const [state, setState] = useState<ResolvedState>(() =>
		id === "" ? { kind: "ready", labels: {} } : { kind: "loading" },
	);
	const cacheRef = useLabelCache(refetchKey, state);
	const knownRef = useRef(knownLabels);
	knownRef.current = knownLabels;

	useEffect(() => {
		const cached = cacheRef.current.labels;
		const known = { ...knownRef.current, ...cached };
		if (id === "" || known[id] !== undefined) {
			setState({ kind: "ready", labels: known });
			return;
		}
		const { onLoad } = optsRef.current;
		if (!onLoad) {
			warnMissingOnLoad(warnedRef, fieldName);
			setState({ kind: "ready", labels: cached });
			return;
		}
		let cancelled = false;
		setState({ kind: "loading" });
		onLoad(ctxRef.current, id).then(
			(row) => {
				if (!cancelled) {
					const labels = mergeLabel({ cached, id, row, opts: optsRef.current });
					setState({ kind: "ready", labels });
				}
			},
			() => {
				if (!cancelled) {
					setState({ kind: "ready", labels: cached });
				}
			},
		);
		return () => {
			cancelled = true;
		};
	}, [id, fieldName, refetchKey, cacheRef]);
	return state;
}

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
	const idsKey = useMemo(() => (value ?? []).join(ID_SEPARATOR), [value]);
	const [state, setState] = useState<ResolvedState>(() =>
		idsKey === "" ? { kind: "ready", labels: {} } : { kind: "loading" },
	);

	useEffect(() => {
		const ids = idsKey === "" ? [] : idsKey.split(ID_SEPARATOR);
		if (ids.length === 0) {
			setState({ kind: "ready", labels: {} });
			return;
		}
		const { onLoad, optionLabel, optionValue } = optsRef.current;
		if (!onLoad) {
			warnMissingOnLoad(warnedRef, fieldName);
			setState({ kind: "ready", labels: {} });
			return;
		}
		let cancelled = false;
		setState({ kind: "loading" });
		onLoad(ctxRef.current, ids).then(
			(rows) => {
				if (cancelled) {
					return;
				}
				setState({
					kind: "ready",
					labels: buildLabelMap(rows, optionValue, optionLabel),
				});
			},
			() => {
				if (!cancelled) {
					setState({ kind: "ready", labels: {} });
				}
			},
		);
		return () => {
			cancelled = true;
		};
	}, [idsKey, fieldName]);
	return state;
}

interface MergeLabelArgs {
	cached: Record<string, string>;
	id: string;
	row: unknown;
	opts: AsyncSingleOptionsBag;
}

function mergeLabel({ cached, id, row, opts }: MergeLabelArgs): Record<string, string> {
	const value = opts.optionValue ? String(opts.optionValue(row)) : id;
	return { ...cached, [value]: opts.optionLabel ? opts.optionLabel(row) : value };
}

function warnMissingOnLoad(warnedRef: { current: boolean }, fieldName: string): void {
	if (warnedRef.current) {
		return;
	}
	warnedRef.current = true;
	console.warn(
		`[tabletop] field ${fieldName}: async field has initial value but no onLoad — displaying raw value`,
	);
}

function buildLabelMap(
	rows: unknown[],
	optionValue: ((row: unknown) => string) | undefined,
	optionLabel: ((row: unknown) => string) | undefined,
): Record<string, string> {
	const labels: Record<string, string> = {};
	for (const row of rows) {
		if (!optionValue) {
			continue;
		}
		const v = String(optionValue(row));
		labels[v] = optionLabel ? optionLabel(row) : v;
	}
	return labels;
}
