import { CalendarIcon } from "lucide-react";
import { type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useLocale, useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LazyRangeCalendar } from "./daterangeCalendarLazy";
import {
	type DisabledRange,
	navClamp,
	parseDay,
	type QueryRanges,
	rangeMatchers,
	useDisabledRanges,
} from "./daterangeDisabled";
import { type DaterangeValue, formatRange, toDateRange, toIsoDay } from "./daterangeValue";
import { DateTypedInput, focusTypedInput } from "./dateTypedInput";
import { useFieldDependencies } from "./fieldDependencies";
import type { FieldFormProps } from "./fieldProps";

export { parseDay } from "./daterangeDisabled";
export { type DaterangeValue, toDateRange } from "./daterangeValue";

export interface DaterangeOptionsBag {
	dependsOn?: string[];
	keepValue?: boolean;
	whenParentEmpty?: "disabled" | "empty";
	disabledRanges?: DisabledRange[];
	/** Injected at materialize time — never on the wire. */
	queryRanges?: QueryRanges;
}

export interface DaterangeFormProps extends FieldFormProps<DaterangeValue, DaterangeOptionsBag> {
	fallback?: ReactNode;
}

export function DaterangeForm(props: DaterangeFormProps) {
	// The dependent path needs the action context (its hook throws without a
	// provider), so it only mounts for a field that declared parents — a plain
	// daterange keeps rendering anywhere, filter bars included.
	if (props.options?.dependsOn?.length) {
		return <DependentDaterange {...props} />;
	}
	return <DaterangeControl {...props} ranges={props.options?.disabledRanges ?? []} />;
}

function DependentDaterange(props: DaterangeFormProps) {
	const ctx = useClientActionContext();
	const opts = props.options ?? {};
	const dep = useFieldDependencies({ config: opts });
	const ranges = useDisabledRanges({
		initial: opts.disabledRanges ?? [],
		depsKey: dep.depsKey,
		initialDepsKey: dep.initialDepsKey,
		deps: dep.deps,
		query: opts.queryRanges,
		ctx,
	});
	return (
		<DaterangeControl
			{...props}
			ranges={ranges}
			disabled={props.disabled || dep.disabledByParent}
		/>
	);
}

interface DaterangeControlProps extends DaterangeFormProps {
	ranges: DisabledRange[];
}

function DaterangeControl({
	name,
	value,
	onChange,
	disabled,
	fallback,
	ranges,
}: DaterangeControlProps) {
	const t = useTranslation();
	const { locale } = useLocale();
	const applied = toDateRange(value);
	const [open, setOpen] = useState(false);
	// A range is half-picked between the two clicks. Holding that locally lets
	// the calendar show the in-progress selection without emitting a partial
	// value, which a table filter would otherwise refetch on.
	const [draft, setDraft] = useState<DateRange | undefined>(applied);
	const [picking, setPicking] = useState(false);
	const disabledMatchers = useMemo(() => rangeMatchers(ranges), [ranges]);
	const clamp = useMemo(() => navClamp(ranges), [ranges]);

	// Reopening starts from the applied value so an abandoned half-pick does not
	// survive to the next open.
	useEffect(() => {
		if (open) {
			setDraft(toDateRange(value));
			setPicking(false);
		}
	}, [open, value]);

	function handleSelect(next: DateRange | undefined, clicked: Date): void {
		setDraft(next);
		// With a range already applied, day-picker edits it rather than starting
		// over: the first click comes back complete, pairing the clicked day with
		// an old bound. Emitting that would apply a range the user never picked,
		// so the first click always opens a fresh selection on the clicked day.
		if (!picking) {
			setPicking(true);
			setDraft({ from: clicked, to: undefined });
			return;
		}
		if (next?.from && next.to) {
			setPicking(false);
			onChange({ from: toIsoDay(next.from), to: toIsoDay(next.to) });
		}
	}

	// Typed bounds land in the same draft the clicks build, so the calendar
	// shows them; the range only leaves the field once both ends are known.
	function handleTyped(edge: "from" | "to", iso: string): void {
		const day = parseDay(iso);
		if (!day) {
			return;
		}
		// day-picker's DateRange requires a `from`, so a lone end bound is held
		// with from === to for display; it must not be emitted as a real range.
		const from = edge === "from" ? day : draft?.from;
		const to = edge === "to" ? day : draft?.to;
		setDraft({ from: from ?? day, to });
		setPicking(false);
		if (from && to && from <= to) {
			onChange({ from: toIsoDay(from), to: toIsoDay(to) });
		}
	}

	// A typed bound the calendar would refuse must not slip in through text.
	// Compared against the wire ranges (inclusive ends, ISO days sort as strings)
	// rather than the day-picker matchers, which are exclusive and shifted.
	function acceptTyped(iso: string): boolean {
		return !ranges.some(
			(range) => (!range.from || iso >= range.from) && (!range.to || iso <= range.to),
		);
	}

	// The native inputs this replaced cleared by emptying them; without this a
	// form-rendered daterange has no way back to empty (the filter bar has Reset).
	function handleClear(): void {
		setDraft(undefined);
		setPicking(false);
		setOpen(false);
		onChange({ from: null, to: null });
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
					{formatRange(applied, locale) || t("field.daterange.placeholder")}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					focusTypedInput(event.currentTarget);
				}}
			>
				<div className="flex gap-2 border-b p-2">
					<DateTypedInput
						value={draft?.from ? toIsoDay(draft.from) : null}
						onCommit={(iso) => handleTyped("from", iso)}
						accept={acceptTyped}
						label={t("field.daterange.from_label")}
						testId="daterange-input-from"
					/>
					<DateTypedInput
						value={draft?.to ? toIsoDay(draft.to) : null}
						onCommit={(iso) => handleTyped("to", iso)}
						accept={acceptTyped}
						label={t("field.daterange.to_label")}
						testId="daterange-input-to"
					/>
				</div>
				<Suspense
					fallback={
						fallback ?? <div className="h-72 w-72 animate-pulse rounded-md bg-muted" />
					}
				>
					<LazyRangeCalendar
						selected={draft}
						onSelect={handleSelect}
						disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
						startMonth={clamp.startMonth}
						endMonth={clamp.endMonth}
					/>
				</Suspense>
				{applied ? (
					<div className="border-t p-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full"
							data-testid="daterange-clear"
							onClick={handleClear}
						>
							{t("field.daterange.clear")}
						</Button>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
