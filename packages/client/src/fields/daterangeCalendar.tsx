import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "../ui/calendar";
import { browserLocale, resolveWeekStart } from "./daterangeLocale";

interface DaterangeCalendarProps {
	selected: DateRange | undefined;
	onSelect: (next: DateRange | undefined) => void;
}

/**
 * The popover body, loaded on demand. Two months side by side on desktop; one
 * below the sm breakpoint, where two would not fit.
 */
export function DaterangeCalendar({ selected, onSelect }: DaterangeCalendarProps) {
	const weekStartsOn = resolveWeekStart(browserLocale());
	const months = useMonthCount();

	return (
		<Calendar
			mode="range"
			numberOfMonths={months}
			weekStartsOn={weekStartsOn}
			defaultMonth={selected?.from}
			selected={selected}
			onSelect={onSelect}
			autoFocus
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
