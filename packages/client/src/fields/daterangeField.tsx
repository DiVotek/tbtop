import { CalendarIcon } from "lucide-react";
import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { FieldFormProps } from "./fieldProps";

export type DaterangeValue = { from?: string | null; to?: string | null } | null;

// The calendar (react-day-picker plus its date-fns dependency) stays out of the
// static graph: daterange also renders in the table filter bar, which nearly
// every page has. Only the popover body is lazy — the trigger renders eagerly
// so the filter bar keeps its height while the chunk loads.
const LazyRangeCalendar = lazy(() =>
	import("./daterangeCalendar").then((m) => ({ default: m.DaterangeCalendar })),
);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DaterangeFormProps extends FieldFormProps<DaterangeValue> {
	fallback?: ReactNode;
}

export function DaterangeForm({ name, value, onChange, disabled, fallback }: DaterangeFormProps) {
	const t = useTranslation();
	const applied = toDateRange(value);
	const [open, setOpen] = useState(false);
	// A range is half-picked between the two clicks. Holding that locally lets
	// the calendar show the in-progress selection without emitting a partial
	// value, which a table filter would otherwise refetch on.
	const [draft, setDraft] = useState<DateRange | undefined>(applied);
	const [picking, setPicking] = useState(false);

	// Reopening starts from the applied value so an abandoned half-pick does not
	// survive to the next open.
	useEffect(() => {
		if (open) {
			setDraft(toDateRange(value));
			setPicking(false);
		}
	}, [open, value]);

	function handleSelect(next: DateRange | undefined): void {
		setDraft(next);
		// With a range already applied, day-picker edits it rather than starting
		// over: the first click comes back complete, pairing the new day with the
		// old opposite bound. Emitting that would apply a range the user never
		// picked, so the first click always opens a fresh selection.
		if (!picking) {
			setPicking(true);
			setDraft(next?.from ? { from: next.from, to: undefined } : undefined);
			return;
		}
		if (next?.from && next.to) {
			setPicking(false);
			onChange({ from: toIsoDay(next.from), to: toIsoDay(next.to) });
		}
	}

	// `modal`: the popover portals out of the DOM, so inside the filters modal a
	// day click would read as an interaction outside the dialog and dismiss it
	// before the second click could land.
	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					name={name}
					data-testid="daterange-trigger"
					className="justify-start font-normal"
				>
					<CalendarIcon className="size-4" aria-hidden />
					{formatRange(applied) || t("field.daterange.placeholder")}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Suspense
					fallback={
						fallback ?? <div className="h-72 w-72 animate-pulse rounded-md bg-muted" />
					}
				>
					<LazyRangeCalendar selected={draft} onSelect={handleSelect} />
				</Suspense>
			</PopoverContent>
		</Popover>
	);
}

/** The wire shape uses null for an empty bound; react-day-picker uses undefined. */
export function toDateRange(value: DaterangeValue): DateRange | undefined {
	const from = parseDay(value?.from);
	const to = parseDay(value?.to);
	if (!from && !to) {
		return undefined;
	}
	return { from, to };
}

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

/** Local calendar day, not toISOString() — that shifts across the UTC boundary. */
function toIsoDay(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatRange(range: DateRange | undefined): string {
	if (!range?.from || !range.to) {
		return "";
	}
	return `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`;
}
