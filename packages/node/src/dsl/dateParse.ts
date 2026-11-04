/** Carbon::parse() for the values admin records hold, without Carbon. */

/** A wall-clock time and the offset it is in (minutes east of UTC). */
export interface Moment {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	micro: number;
	offset: number;
	/** The IANA zone; `Z` or null (an offset) when the value carried its own. */
	zone: string | null;
}

type Clock = Omit<Moment, "offset" | "zone">;

const DATE_TIME =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;
const TIME = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/;

const micro = (fraction: string | undefined) => Number((fraction ?? "").padEnd(6, "0").slice(0, 6));

/**
 * A Date is read in `zone`; a naive string is that wall clock in `zone`; one
 * with an offset keeps it (Carbon does); a bare time is today in `zone`.
 */
export function parseMoment(value: unknown, zone: string): Moment | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : inZone(value, zone);
	}
	const text = String(value).trim();
	const full = DATE_TIME.exec(text);
	if (full !== null) {
		return fromMatch(full, zone);
	}
	const time = TIME.exec(text);
	if (time !== null) {
		const today = inZone(new Date(), zone);
		const [, h, mi, s, fraction] = time;
		return withClock(
			{
				...today,
				hour: Number(h),
				minute: Number(mi),
				second: Number(s ?? 0),
				micro: micro(fraction),
			},
			zone,
		);
	}
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? null : inZone(parsed, zone);
}

function fromMatch(match: RegExpExecArray, zone: string): Moment {
	const [, y, mo, d, h, mi, s, fraction, offset] = match;
	const clock: Clock = {
		year: Number(y),
		month: Number(mo),
		day: Number(d),
		hour: Number(h ?? 0),
		minute: Number(mi ?? 0),
		second: Number(s ?? 0),
		micro: micro(fraction),
	};
	if (offset === undefined) {
		return withClock(clock, zone);
	}
	return {
		...clock,
		offset: offsetMinutes(offset),
		zone: offset.toUpperCase() === "Z" ? "Z" : null,
	};
}

function offsetMinutes(text: string): number {
	if (text.toUpperCase() === "Z") {
		return 0;
	}
	const digits = text.replace(":", "");
	const minutes = Number(digits.slice(1, 3)) * 60 + Number(digits.slice(3, 5));
	return digits.startsWith("-") ? -minutes : minutes;
}

/** A wall clock in `zone`, with the offset `zone` has at that moment. */
function withClock(clock: Clock, zone: string): Moment {
	const guess = Date.UTC(
		clock.year,
		clock.month - 1,
		clock.day,
		clock.hour,
		clock.minute,
		clock.second,
	);
	const first = zoneOffset(new Date(guess), zone);
	const offset = zoneOffset(new Date(guess - first * 60_000), zone);
	return { ...clock, offset, zone };
}

/** The wall clock of an instant in `zone`. */
export function inZone(instant: Date, zone: string): Moment {
	const offset = zoneOffset(instant, zone);
	const local = new Date(instant.getTime() + offset * 60_000);
	return {
		year: local.getUTCFullYear(),
		month: local.getUTCMonth() + 1,
		day: local.getUTCDate(),
		hour: local.getUTCHours(),
		minute: local.getUTCMinutes(),
		second: local.getUTCSeconds(),
		micro: local.getUTCMilliseconds() * 1000,
		offset,
		zone,
	};
}

/** Minutes `zone` is ahead of UTC at `instant`. */
function zoneOffset(instant: Date, zone: string): number {
	const name =
		new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
			.formatToParts(instant)
			.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
	const match = /GMT([+-]\d{2}):?(\d{2})?/.exec(name);
	return match === null ? 0 : offsetMinutes(`${match[1]}${match[2] ?? "00"}`);
}
