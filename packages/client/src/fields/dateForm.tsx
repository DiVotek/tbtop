import { CalendarIcon } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useLocale, useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LazyDateCalendar } from "./dateCalendarLazy";
import { type DisabledRange, navClamp, parseDay, rangeMatchers } from "./daterangeDisabled";
import { toIsoDay } from "./daterangeValue";
import { DateTypedInput, focusTypedInput } from "./dateTypedInput";
import { formatDay } from "./dateValue";
import { type FieldFormProps, fieldId } from "./fieldProps";

export interface DateOptionsBag {
	yearPicker?: boolean;
	minDate?: string;
	maxDate?: string;
}

/**
 * Date field control: a Popover + Calendar in single-day mode. Unlike
 * daterange, one click both selects and closes — there is no second bound to
 * wait for, so no draft/picking state is needed.
 */
export function DateForm({
	id,
	name,
	value,
	onChange,
	disabled,
	options,
}: FieldFormProps<string, DateOptionsBag>) {
	const t = useTranslation();
	const { locale } = useLocale();
	const selected = parseDay(value ?? undefined);
	const [open, setOpen] = useState(false);

	const { minDate, maxDate, yearPicker } = options ?? {};
	// min/max as open-ended disabled ranges reuses daterange's inclusive-end
	// semantics, so both the matchers and the nav clamp stay consistent.
	const bounds = useMemo<DisabledRange[]>(() => {
		const out: DisabledRange[] = [];
		if (minDate) {
			out.push({ from: null, to: shiftDay(minDate, -1) });
		}
		if (maxDate) {
			out.push({ from: shiftDay(maxDate, 1), to: null });
		}
		return out;
	}, [minDate, maxDate]);

	const matchers = useMemo(() => rangeMatchers(bounds), [bounds]);
	const clamp = useMemo(() => navClamp(bounds), [bounds]);

	function handleSelect(day: Date | undefined): void {
		if (!day) {
			return;
		}
		onChange(toIsoDay(day));
		setOpen(false);
	}

	// Typed entry bypasses the calendar's own disabling, so min/max is enforced
	// here too — otherwise text could set a day the calendar refuses to offer.
	// ISO days compare correctly as strings.
	function acceptTyped(iso: string): boolean {
		return !((minDate && iso < minDate) || (maxDate && iso > maxDate));
	}

	function handleClear(): void {
		setOpen(false);
		onChange(null);
	}

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					id={fieldId({ id, name })}
					disabled={disabled}
					name={name}
					data-testid="date-trigger"
					className="w-full justify-start font-normal"
				>
					<CalendarIcon className="size-4" aria-hidden />
					{formatDay(selected, locale) || t("field.date.placeholder")}
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
				<div className="border-b p-2">
					<DateTypedInput
						value={value}
						onCommit={onChange}
						accept={acceptTyped}
						label={t("field.date.typed_label")}
						testId="date-input"
					/>
				</div>
				<Suspense
					fallback={<div className="h-72 w-72 animate-pulse rounded-md bg-muted" />}
				>
					<LazyDateCalendar
						selected={selected}
						onSelect={handleSelect}
						disabled={matchers}
						yearPicker={yearPicker}
						startMonth={clamp.startMonth}
						endMonth={clamp.endMonth}
					/>
				</Suspense>
				{selected ? (
					<div className="border-t p-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full"
							data-testid="date-clear"
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

/** Shifts an ISO day by whole days, returning ISO again; passes malformed input through. */
function shiftDay(iso: string, delta: number): string {
	const date = parseDay(iso);
	if (!date) {
		return iso;
	}
	return toIsoDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta));
}
