import { lazy } from "react";

// Exception to the static-import rule: React.lazy code splitting only works
// through a dynamic import() — a static import would pull react-day-picker and
// its date-fns dependency into the static graph. daterange renders in the table
// filter bar, which nearly every page has, so only the popover body is lazy —
// the trigger renders eagerly and the filter bar keeps its height while the
// chunk loads.
export const LazyRangeCalendar = lazy(async () => {
	const m = await import("./daterangeCalendar");
	return { default: m.DaterangeCalendar };
});
