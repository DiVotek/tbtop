import { type Choice, choicesOf, type EnumSource, normalizeOptions } from "../options";
import type { Field } from "./field";

export { mixin } from "../mixin";

/** What a mixin reaches on the field it lands on. */
interface Bag {
	name: string;
	opts: Record<string, unknown>;
	set(key: string, value: unknown): unknown;
	rules(rules: string | string[]): unknown;
	ruleEntries(): string[];
	replaceRules(rules: string[]): unknown;
}

const bag = (field: object): Bag => field as unknown as Bag;

/** Text-like validation (HasStringRules.php): min/max reach the wire, the rest are server-only. */
export class StringRules {
	/** Minimum character count. */
	minLength(length: number): this {
		return chain(this, `min:${length}`);
	}

	/** Maximum character count. */
	maxLength(length: number): this {
		return chain(this, `max:${length}`);
	}

	/** Exact character count. */
	length(length: number): this {
		return chain(this, `size:${length}`);
	}

	/** Match a PCRE pattern, e.g. `/^[a-z]+$/`. */
	regex(pattern: string): this {
		bag(this).rules([`regex:${pattern}`]);
		return this;
	}

	/** Letters only. */
	alpha(): this {
		return chain(this, "alpha");
	}

	/** Letters and numbers only. */
	alphaNum(): this {
		return chain(this, "alpha_num");
	}

	/** Letters, numbers, dashes and underscores only. */
	alphaDash(): this {
		return chain(this, "alpha_dash");
	}

	/** Value must start with one of the given substrings. */
	startsWith(...values: string[]): this {
		return chain(this, `starts_with:${values.join(",")}`);
	}

	/** Value must end with one of the given substrings. */
	endsWith(...values: string[]): this {
		return chain(this, `ends_with:${values.join(",")}`);
	}
}

/** Number-like validation (HasNumericRules.php); ranges pair with `numeric`. */
export class NumericRules {
	/** Smallest accepted value. */
	minValue(value: number): this {
		return chain(this, `numeric|min:${value}`);
	}

	/** Largest accepted value. */
	maxValue(value: number): this {
		return chain(this, `numeric|max:${value}`);
	}

	/** Value must fall within the inclusive range. */
	between(min: number, max: number): this {
		return chain(this, `numeric|between:${min},${max}`);
	}

	/** Value must be a multiple of the given step. */
	multipleOf(value: number): this {
		return chain(this, `multiple_of:${value}`);
	}

	/** Value must be an integer. */
	integer(): this {
		return chain(this, "integer");
	}

	/** Value must be numeric. */
	numeric(): this {
		return chain(this, "numeric");
	}
}

/** Table-backed validation (HasDatabaseRules.php); server-only. */
export class DatabaseRules {
	/** Value must be unique in table.column (column defaults to the field name). */
	unique(table: string, column?: string): this {
		return chain(this, `unique:${table},${column ?? bag(this).name}`);
	}

	/** Value must exist in table.column (column defaults to the field name). */
	exists(table: string, column?: string): this {
		return chain(this, `exists:${table},${column ?? bag(this).name}`);
	}

	/** Skip this record in the last unique() check (edit pages). */
	ignore(id: string | number, idColumn = "id"): this {
		const rules = bag(this).ruleEntries();
		const index = rules.findLastIndex((rule) => rule.startsWith("unique:"));
		if (index === -1) {
			throw new Error(`"${bag(this).name}": call unique() before ignore().`);
		}
		rules[index] = `${rules[index]},${id},${idColumn}`;
		bag(this).replaceRules(rules);
		return this;
	}
}

/** Parent fields whose values feed this field's server closure (HasDependencies.php). */
export class Dependencies {
	/** Declare the parent field(s); their values reach the closure as `{field: value}`. */
	dependsOn(fields: string | string[]): this {
		bag(this).set("dependsOn", typeof fields === "string" ? [fields] : fields);
		return this;
	}

	/** Keep the selected value when a parent changes (default: reset). */
	keepValueOnParentChange(keep = true): this {
		return toggle(this, "keepValue", keep);
	}

	/** While a parent is empty: 'disabled' (default) or 'empty' (enabled, empty list). */
	whenParentEmpty(mode: "disabled" | "empty"): this {
		if (mode !== "disabled" && mode !== "empty") {
			throw new Error(`whenParentEmpty() expects 'disabled' or 'empty', got "${mode}".`);
		}
		if (mode === "empty") {
			bag(this).set("whenParentEmpty", "empty");
			return this;
		}
		delete bag(this).opts.whenParentEmpty;
		return this;
	}

	dependsOnFields(): string[] {
		const list = bag(this).opts.dependsOn;
		return Array.isArray(list) ? [...list] : [];
	}
}

/** The fixed `{value, label}` list (HasOptions.php); values ship as strings. */
export class Options {
	/** A literal option list, or an enum source (`defineEnum`, a TS enum). */
	options(options: Choice[] | EnumSource): this {
		bag(this).set("options", normalizeOptions(choicesOf(options)));
		return this;
	}
}

/** More than one value (HasMultiple.php). */
export class Multiple {
	/** Allow selecting more than one value. */
	multiple(value = true): this {
		bag(this).set("multiple", value);
		return this;
	}

	isMultiple(): boolean {
		return bag(this).opts.multiple === true;
	}
}

function chain<T>(field: T, rules: string): T {
	bag(field as object).rules(rules);
	return field;
}

function toggle<T>(field: T, key: string, on: boolean): T {
	if (on) {
		bag(field as object).set(key, true);
	} else {
		delete bag(field as object).opts[key];
	}
	return field;
}

export type AnyField = Field<string, unknown>;
