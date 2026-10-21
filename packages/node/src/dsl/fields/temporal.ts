import { dependencyValues } from "../dependencies";
import { Dependencies, mixin } from "./concerns";
import { Field } from "./field";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function day(value: Date | string, method: string): string {
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (!DAY.test(value)) {
		throw new Error(`Date::${method}() expects a Y-m-d string or a Date, got "${value}".`);
	}
	return value;
}

/** Calendar day picker; the value is a Y-m-d string (Date.php). */
export class DateField<N extends string = string> extends Field<N, string | null> {
	readonly kind = "date";

	/** Year dropdown in the caption, bounded by minDate()/maxDate(). */
	yearPicker(state = true): this {
		return this.set("yearPicker", state);
	}

	/** Earliest selectable day. */
	minDate(date: Date | string): this {
		return this.set("minDate", day(date, "minDate"));
	}

	/** Latest selectable day. */
	maxDate(date: Date | string): this {
		return this.set("maxDate", day(date, "maxDate"));
	}
}

/** Date and time picker (Datetime.php). */
export class Datetime<N extends string = string> extends Field<N, string | null> {
	readonly kind = "datetime";
}

/** Time-of-day picker (Time.php). */
export class Time<N extends string = string> extends Field<N, string | null> {
	readonly kind = "time";

	/** Minute granularity, 1-60; not with seconds(). */
	minuteStep(minutes: number): this {
		if (minutes < 1 || minutes > 60) {
			throw new Error("Time::minuteStep() must be between 1 and 60 minutes.");
		}
		if (this.optionValue("seconds") === true) {
			throw new Error("Time::minuteStep() cannot be combined with Time::seconds().");
		}
		return this.set("minuteStep", minutes);
	}

	/** Show a seconds picker; not with minuteStep(). */
	seconds(): this {
		if (this.optionValue("minuteStep") !== undefined) {
			throw new Error("Time::seconds() cannot be combined with Time::minuteStep().");
		}
		return this.set("seconds", true);
	}

	/** Second granularity, 1-59; call seconds() first. */
	secondStep(seconds: number): this {
		if (this.optionValue("seconds") !== true) {
			throw new Error("Call Time::seconds() before Time::secondStep().");
		}
		if (seconds < 1 || seconds > 59) {
			throw new Error("Time::secondStep() must be between 1 and 59 seconds.");
		}
		return this.set("secondStep", seconds);
	}
}

export type DayRange = { from: string | null; to: string | null };
export type RangesFn = (deps: Record<string, string>) => DayRange[];

/** Date range; the value is `{from?, to?}` (Daterange.php). */
export class Daterange<N extends string = string> extends Field<
	N,
	{ from?: string; to?: string } | null
> {
	readonly kind = "daterange";
	private rangesFn?: RangesFn;
	private initialDeps: Record<string, string> = {};

	/** Deps-driven disabled day ranges, both ends inclusive; a null end is open. */
	disabledRanges(fn: RangesFn): this {
		this.rangesFn = fn;
		return this;
	}

	disabledRangesClosure(): RangesFn | undefined {
		return this.rangesFn;
	}

	/** The form seeds this so the first ranges use the record's values. */
	seedInitialDeps(record: Record<string, unknown>): void {
		this.initialDeps = dependencyValues(this.dependsOnFields(), record);
	}

	rangesWith(deps: Record<string, unknown>): DayRange[] {
		if (this.rangesFn === undefined) {
			throw new Error(`daterange "${this.name}" has no disabledRanges() closure.`);
		}
		const result = this.rangesFn(dependencyValues(this.dependsOnFields(), deps));
		return result.map((range) => this.normalizeRange(range));
	}

	override toNode() {
		if (this.rangesFn !== undefined) {
			this.opts.disabledRanges = this.rangesWith(this.initialDeps);
		}
		return super.toNode();
	}

	private normalizeRange(range: Partial<DayRange>): DayRange {
		const from = range.from ?? null;
		const to = range.to ?? null;
		if (from === null && to === null) {
			throw new Error(
				`daterange "${this.name}": a disabled range needs at least one non-null end.`,
			);
		}
		return { from, to };
	}
}
export interface Daterange<N extends string = string> extends Dependencies {}
mixin(Daterange, [Dependencies]);
