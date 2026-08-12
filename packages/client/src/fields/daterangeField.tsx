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
	type QueryRanges,
	rangeMatchers,
	useDisabledRanges,
} from "./daterangeDisabled";
import { type DaterangeValue, formatRange, toDateRange, toIsoDay } from "./daterangeValue";
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
	const dep = useFieldDependencies({
		name: props.name,
		config: opts,
		value: props.value,
		onChange: props.onChange,
	});
	const ranges = useDisabledRanges({
		initial: opts.disabledRanges ?? [],
		depsKey: dep.depsKey,
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
			<PopoverContent className="w-auto p-0" align="start">
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
