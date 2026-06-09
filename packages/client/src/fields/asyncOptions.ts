import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientActionContext } from "../structure/types";

export interface AsyncSingleOptionsBag {
	query?: (ctx: ClientActionContext, search: string) => Promise<unknown[]>;
	onLoad?: (ctx: ClientActionContext, value: string) => Promise<unknown>;
	optionLabel?: (row: unknown) => string;
	optionValue?: (row: unknown) => string;
}

export interface AsyncMultiOptionsBag {
	query?: (ctx: ClientActionContext, search: string) => Promise<unknown[]>;
	onLoad?: (ctx: ClientActionContext, values: string[]) => Promise<unknown[]>;
	optionLabel?: (row: unknown) => string;
	optionValue?: (row: unknown) => string;
}

export type ResolvedState = { kind: "loading" } | { kind: "ready"; labels: Record<string, string> };

const ID_SEPARATOR = "";

export interface SingleResolveArgs {
	ctx: ClientActionContext;
	fieldName: string;
	value: string | null;
	opts: AsyncSingleOptionsBag;
}

export function useSingleResolvedLabel({
	ctx,
	fieldName,
	value,
	opts,
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

	useEffect(() => {
		if (id === "") {
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
		onLoad(ctxRef.current, id).then(
			(row) => {
				if (cancelled) {
					return;
				}
				const v = optionValue ? String(optionValue(row)) : id;
				const lbl = optionLabel ? optionLabel(row) : v;
				setState({ kind: "ready", labels: { [v]: lbl } });
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
	}, [id, fieldName]);
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
