import { useEffect, useRef, useState } from "react";
import type { Matcher } from "react-day-picker";
import type { ClientActionContext } from "../structure/types";

/** Wire shape: ISO days (Y-m-d), both ends inclusive-disabled, at least one end set. */
export interface DisabledRange {
	from: string | null;
	to: string | null;
}

/** Injected at materialize time — never on the wire. */
export type QueryRanges = (
	ctx: ClientActionContext,
	deps: Record<string, string>,
) => Promise<DisabledRange[]>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Undefined rather than an Invalid Date: the value can arrive from the URL
 * (t[posts][created_at][from]=…) and a malformed one would break the render.
 * Checks the parsed parts back so an overflowing day like 2026-02-30 is
 * rejected instead of silently becoming 2026-03-02.
 */
export function parseDay(value: string | null | undefined): Date | undefined {
	if (!value || !ISO_DAY.test(value)) {
		return undefined;
	}
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const date = new Date(year, month - 1, day);
	if (date.getMonth() !== month - 1 || date.getDate() !== day) {
		return undefined;
	}
	return date;
}

function dayAfter(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function dayBefore(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

/**
 * Wire ranges → day-picker matchers. The wire ends are inclusive-disabled
 * while day-picker's before/after matchers are exclusive, so an open end
 * shifts by one day: to=X becomes before X+1, from=Y becomes after Y-1.
 */
export function rangeMatchers(ranges: DisabledRange[]): Matcher[] {
	const out: Matcher[] = [];
	for (const range of ranges) {
		const from = parseDay(range.from);
		const to = parseDay(range.to);
		if (from && to) {
			out.push({ from, to });
		} else if (to) {
			out.push({ before: dayAfter(to) });
		} else if (from) {
			out.push({ after: dayBefore(from) });
		}
	}
	return out;
}

/**
 * Navigation clamp from open-ended ranges: an open start ending at X leaves
 * nothing selectable before X+1, an open end starting at Y nothing after Y-1.
 * Closed ranges leave navigation free.
 */
export function navClamp(ranges: DisabledRange[]): { startMonth?: Date; endMonth?: Date } {
	const first = firstSelectableDay(ranges);
	const last = lastSelectableDay(ranges);
	return {
		startMonth: first && startOfMonth(first),
		endMonth: last && startOfMonth(last),
	};
}

/** The day after the latest open-start range's end; undefined without open starts. */
function firstSelectableDay(ranges: DisabledRange[]): Date | undefined {
	let latestEnd: Date | undefined;
	for (const range of ranges) {
		const to = parseDay(range.to);
		if (!parseDay(range.from) && to && (!latestEnd || to > latestEnd)) {
			latestEnd = to;
		}
	}
	return latestEnd && dayAfter(latestEnd);
}

/** The day before the earliest open-end range's start; undefined without open ends. */
function lastSelectableDay(ranges: DisabledRange[]): Date | undefined {
	let earliestStart: Date | undefined;
	for (const range of ranges) {
		const from = parseDay(range.from);
		if (from && !parseDay(range.to) && (!earliestStart || from < earliestStart)) {
			earliestStart = from;
		}
	}
	return earliestStart && dayBefore(earliestStart);
}

function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

interface UseDisabledRangesArgs {
	initial: DisabledRange[];
	depsKey: string;
	deps: Record<string, string>;
	query: QueryRanges | undefined;
	ctx: ClientActionContext;
}

/**
 * The serialized ranges were computed server-side from the same record the
 * form opened with, so the mount-time key must not refetch — only subsequent
 * deps changes do; latest-wins on races (mirrors LiveRegionBlock).
 */
export function useDisabledRanges(args: UseDisabledRangesArgs): DisabledRange[] {
	const { depsKey, query } = args;
	const [ranges, setRanges] = useState(args.initial);
	const prevKeyRef = useRef(depsKey);
	const latestKeyRef = useRef(depsKey);
	const depsRef = useRef(args.deps);
	depsRef.current = args.deps;
	const ctxRef = useRef(args.ctx);
	ctxRef.current = args.ctx;

	useEffect(() => {
		if (!query || prevKeyRef.current === depsKey) {
			return;
		}
		prevKeyRef.current = depsKey;
		latestKeyRef.current = depsKey;
		query(ctxRef.current, depsRef.current).then(
			(fresh) => {
				if (latestKeyRef.current === depsKey) {
					setRanges(fresh);
				}
			},
			() => {
				// A failed refetch keeps the previous ranges: stale disabling is
				// recoverable (PHP validation is the boundary), a broken picker is not.
			},
		);
	}, [depsKey, query]);

	return ranges;
}
