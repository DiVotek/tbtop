import { currentContext } from "./context";
import { type Moment, parseMoment } from "./dateParse";

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

const pad = (n: number, width = 2): string => String(Math.abs(n)).padStart(width, "0");
const utc = (m: Moment) => Date.UTC(m.year, m.month - 1, m.day);
const weekday = (m: Moment) => new Date(utc(m)).getUTCDay();
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dayOfYear = (m: Moment) => (utc(m) - Date.UTC(m.year, 0, 1)) / 86_400_000;
const unix = (m: Moment) =>
	Math.floor(
		(Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second) - m.offset * 60_000) /
			1000,
	);

/** ISO-8601 week-numbering year and week (PHP `o` and `W`). */
function isoWeek(m: Moment): [number, number] {
	const date = new Date(utc(m));
	date.setUTCDate(date.getUTCDate() + 4 - (weekday(m) || 7));
	const year = date.getUTCFullYear();
	return [year, Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7)];
}

function suffix(day: number): string {
	if (day % 100 >= 11 && day % 100 <= 13) {
		return "th";
	}
	return ["th", "st", "nd", "rd"][day % 10] ?? "th";
}

/** `+02:00`, or `+0200` without the colon. */
function offsetText(m: Moment, colon = true): string {
	const sign = m.offset < 0 ? "-" : "+";
	const [h, mi] = [Math.floor(Math.abs(m.offset) / 60), Math.abs(m.offset) % 60];
	return `${sign}${pad(h)}${colon ? ":" : ""}${pad(mi)}`;
}

const DATE_TOKENS: Record<string, (m: Moment) => string> = {
	d: (m) => pad(m.day),
	D: (m) => (DAYS[weekday(m)] ?? "").slice(0, 3),
	j: (m) => String(m.day),
	l: (m) => DAYS[weekday(m)] ?? "",
	N: (m) => String(weekday(m) || 7),
	S: (m) => suffix(m.day),
	w: (m) => String(weekday(m)),
	z: (m) => String(dayOfYear(m)),
	W: (m) => pad(isoWeek(m)[1]),
	F: (m) => MONTHS[m.month - 1] ?? "",
	m: (m) => pad(m.month),
	M: (m) => (MONTHS[m.month - 1] ?? "").slice(0, 3),
	n: (m) => String(m.month),
	t: (m) => String(new Date(Date.UTC(m.year, m.month, 0)).getUTCDate()),
	L: (m) => (isLeap(m.year) ? "1" : "0"),
	o: (m) => String(isoWeek(m)[0]),
	Y: (m) => String(m.year),
	y: (m) => pad(m.year % 100),
};

const TIME_TOKENS: Record<string, (m: Moment) => string> = {
	a: (m) => (m.hour < 12 ? "am" : "pm"),
	A: (m) => (m.hour < 12 ? "AM" : "PM"),
	g: (m) => String(m.hour % 12 || 12),
	G: (m) => String(m.hour),
	h: (m) => pad(m.hour % 12 || 12),
	H: (m) => pad(m.hour),
	i: (m) => pad(m.minute),
	s: (m) => pad(m.second),
	u: (m) => pad(m.micro, 6),
	v: (m) => pad(Math.floor(m.micro / 1000), 3),
	e: (m) => m.zone ?? offsetText(m),
	O: (m) => offsetText(m, false),
	P: (m) => offsetText(m),
	p: (m) => (m.offset === 0 ? "Z" : offsetText(m)),
	// PHP prints a tzdb abbreviation (EEST); Intl has none, so the offset stands in.
	T: (m) => (m.zone === "Z" ? "Z" : offsetText(m)),
	Z: (m) => String(m.offset * 60),
	U: (m) => String(unix(m)),
};

const TOKENS = { ...DATE_TOKENS, ...TIME_TOKENS };

/** Composite formats, expanded before the single tokens. */
const COMPOSITES: Record<string, string> = { c: "Y-m-d\\TH:i:sP", r: "D, d M Y H:i:s O" };

function render(m: Moment, format: string): string {
	let out = "";
	for (let i = 0; i < format.length; i++) {
		const ch = format[i] ?? "";
		if (ch === "\\") {
			out += format[++i] ?? "";
		} else if (COMPOSITES[ch] !== undefined) {
			out += render(m, COMPOSITES[ch]);
		} else {
			out += TOKENS[ch]?.(m) ?? ch;
		}
	}
	return out;
}

/**
 * Carbon::parse($value)->format($format): a naive value is a wall clock in the
 * app timezone, a value with an offset keeps its own; unparseable values pass through.
 */
export function formatPhpDate(value: unknown, format: string): unknown {
	const moment = parseMoment(value, currentContext().timezone);
	return moment === null ? value : render(moment, format);
}
