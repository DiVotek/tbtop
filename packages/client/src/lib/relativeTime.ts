interface Division {
	amount: number;
	unit: Intl.RelativeTimeFormatUnit;
}

const DIVISIONS: Division[] = [
	{ amount: 60, unit: "second" },
	{ amount: 60, unit: "minute" },
	{ amount: 24, unit: "hour" },
	{ amount: 7, unit: "day" },
	{ amount: 4.34524, unit: "week" },
	{ amount: 12, unit: "month" },
	{ amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/**
 * Locale-aware "2 minutes ago" from an ISO timestamp, via Intl — no dep.
 * Returns "" for an unparseable input so the caller can omit the line.
 */
export function relativeTime(iso: string, locale?: string, now: Date = new Date()): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	let delta = (date.getTime() - now.getTime()) / 1000;
	for (const division of DIVISIONS) {
		if (Math.abs(delta) < division.amount) {
			return rtf.format(Math.round(delta), division.unit);
		}
		delta /= division.amount;
	}
	return rtf.format(Math.round(delta), "year");
}
