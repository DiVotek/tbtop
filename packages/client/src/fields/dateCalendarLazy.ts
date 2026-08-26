import { lazy } from "react";

// Exception to the static-import rule: needed for React.lazy code splitting so
// react-day-picker (and date-fns) stay out of the main entry's static graph.
// Mirrors daterangeCalendarLazy.ts.
export const LazyDateCalendar = lazy(async () => {
	const mod = await import("./dateCalendar");
	return { default: mod.DateCalendar };
});
