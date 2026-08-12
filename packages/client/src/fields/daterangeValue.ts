import type { DateRange } from "react-day-picker";
import { parseDay } from "./daterangeDisabled";
import { usableTag } from "./daterangeLocale";

export type DaterangeValue = { from?: string | null; to?: string | null } | null;

/** The wire shape uses null for an empty bound; react-day-picker uses undefined. */
export function toDateRange(value: DaterangeValue): DateRange | undefined {
	const from = parseDay(value?.from);
	const to = parseDay(value?.to);
	if (!from && !to) {
		return undefined;
	}
	return { from, to };
}

/** Local calendar day, not toISOString() — that shifts across the UTC boundary. */
export function toIsoDay(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatRange(range: DateRange | undefined, locale: string): string {
	if (!range?.from || !range.to) {
		return "";
	}
	const tag = usableTag(locale);
	return `${range.from.toLocaleDateString(tag)} – ${range.to.toLocaleDateString(tag)}`;
}
