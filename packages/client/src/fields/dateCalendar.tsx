import { useMemo } from "react";
import type { Matcher } from "react-day-picker";
import { useLocale } from "../i18n/i18n";
import { Calendar } from "../ui/calendar";
import { intlFormatters, regionalTag, resolveWeekStart } from "./daterangeLocale";

interface DateCalendarProps {
	selected: Date | undefined;
	onSelect: (day: Date | undefined) => void;
	disabled?: Matcher[];
	yearPicker?: boolean;
	startMonth?: Date;
	endMonth?: Date;
}

/** The popover body, loaded on demand. A single month — there is only one day to pick. */
export function DateCalendar({
	selected,
	onSelect,
	disabled,
	yearPicker,
	startMonth,
	endMonth,
}: DateCalendarProps) {
	const { locale } = useLocale();
	const formatters = useMemo(() => intlFormatters(locale), [locale]);

	const weekStartsOn = resolveWeekStart(regionalTag(locale));

	return (
		<Calendar
			mode="single"
			lang={locale}
			formatters={formatters}
			weekStartsOn={weekStartsOn}
			captionLayout={yearPicker ? "dropdown-years" : "label"}
			startMonth={startMonth}
			endMonth={endMonth}
			defaultMonth={selected ?? new Date()}
			selected={selected}
			onSelect={onSelect}
			disabled={disabled}
			autoFocus
		/>
	);
}
