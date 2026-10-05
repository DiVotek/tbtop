import { useEffect, useMemo, useState } from "react";
import type { DateRange, Matcher } from "react-day-picker";
import { useLocale } from "../i18n/i18n";
import { Calendar } from "../ui/calendar";
import { intlFormatters, regionalTag, resolveWeekStart } from "./daterangeLocale";

interface DaterangeCalendarProps {
	selected: DateRange | undefined;
	// day-picker folds a click into the applied range, so `next` cannot say which
	// day was clicked — `clicked` is its trigger date.
	onSelect: (next: DateRange | undefined, clicked: Date) => void;
	disabled?: Matcher[];
	startMonth?: Date;
	endMonth?: Date;
}

/**
 * The popover body, loaded on demand. Two months side by side on desktop; one
 * below the sm breakpoint, where two would not fit.
 */
export function DaterangeCalendar({
	selected,
	onSelect,
	disabled,
	startMonth,
	endMonth,
}: DaterangeCalendarProps) {
	const { locale } = useLocale();
	const months = useMonthCount();
	const formatters = useMemo(() => intlFormatters(locale), [locale]);

	const weekStartsOn = resolveWeekStart(regionalTag(locale));

	return (
		<Calendar
			mode="range"
			numberOfMonths={months}
			lang={locale}
			formatters={formatters}
			weekStartsOn={weekStartsOn}
			defaultMonth={selected?.from}
			selected={selected}
			onSelect={onSelect}
			disabled={disabled}
			startMonth={startMonth}
			endMonth={endMonth}
		/>
	);
}

/** Matches Tailwind's sm breakpoint — two months need ~36rem of popover width. */
function useMonthCount(): number {
	const [wide, setWide] = useState(() => matchWide()?.matches ?? true);

	useEffect(() => {
		const query = matchWide();
		if (!query) {
			return;
		}
		const sync = () => setWide(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	return wide ? 2 : 1;
}

function matchWide(): MediaQueryList | undefined {
	return typeof window === "undefined" || !window.matchMedia
		? undefined
		: window.matchMedia("(min-width: 640px)");
}
