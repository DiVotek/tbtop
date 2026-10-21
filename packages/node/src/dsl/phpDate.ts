import { currentContext } from "./context";

interface Parts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	weekday: number;
}

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number, width = 2): string => String(n).padStart(width, "0");

/** The PHP `date()` tokens admin pages use; anything else is a literal. */
const TOKENS: Record<string, (p: Parts) => string> = {
	Y: (p) => String(p.year),
	y: (p) => pad(p.year % 100),
	m: (p) => pad(p.month),
	n: (p) => String(p.month),
	d: (p) => pad(p.day),
	j: (p) => String(p.day),
	H: (p) => pad(p.hour),
	G: (p) => String(p.hour),
	h: (p) => pad(p.hour % 12 || 12),
	g: (p) => String(p.hour % 12 || 12),
	i: (p) => pad(p.minute),
	s: (p) => pad(p.second),
	A: (p) => (p.hour < 12 ? "AM" : "PM"),
	a: (p) => (p.hour < 12 ? "am" : "pm"),
	M: (p) => (MONTHS[p.month - 1] ?? "").slice(0, 3),
	F: (p) => MONTHS[p.month - 1] ?? "",
	D: (p) => (DAYS[p.weekday] ?? "").slice(0, 3),
	l: (p) => DAYS[p.weekday] ?? "",
};

/**
 * Carbon::parse($value)->format($format): a naive "Y-m-d H:i:s" reads in the
 * app timezone, an instant with an offset is converted into it.
 */
export function formatPhpDate(value: unknown, format: string): unknown {
	const zone = currentContext().timezone;
	const instant = parseInstant(value, zone);
	if (instant === null) {
		return value;
	}
	const parts = zoned(instant, zone);
	let out = "";
	for (let i = 0; i < format.length; i++) {
		const ch = format[i] ?? "";
		if (ch === "\\") {
			out += format[++i] ?? "";
			continue;
		}
		const token = TOKENS[ch];
		out += token ? token(parts) : ch;
	}
	return out;
}

function parseInstant(value: unknown, zone: string): Date | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	const text = String(value).trim();
	const naive = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
	if (naive) {
		const [y, mo, d, h, mi, s] = naive.slice(1).map((v) => Number(v ?? 0));
		return fromZoned([y, mo, d, h, mi, s] as number[], zone);
	}
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The UTC instant whose wall-clock time in `zone` is the given fields. */
function fromZoned(f: number[], zone: string): Date {
	const [y = 0, mo = 1, d = 1, h = 0, mi = 0, s = 0] = f;
	const guess = Date.UTC(y, mo - 1, d, h, mi, s);
	const p = zoned(new Date(guess), zone);
	const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess;
	return new Date(guess - offset);
}

function zoned(instant: Date, zone: string): Parts {
	const fmt = new Intl.DateTimeFormat("en-US", {
		timeZone: zone,
		hourCycle: "h23",
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		weekday: "short",
	});
	const get = (type: string): string =>
		fmt.formatToParts(instant).find((p) => p.type === type)?.value ?? "0";
	return {
		year: Number(get("year")),
		month: Number(get("month")),
		day: Number(get("day")),
		hour: Number(get("hour")),
		minute: Number(get("minute")),
		second: Number(get("second")),
		weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
	};
}
