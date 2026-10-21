import { includes } from "../node";
import { type Choice, choicesOf, type EnumSource, normalizeOptions } from "../options";
import { Affixes } from "./affix";
import { DatabaseRules, Dependencies, Multiple, mixin } from "./concerns";
import { Field, type WithValue } from "./field";

/** The submitted value of an option list: its values, as strings. */
export type ChoiceValue<C extends readonly Choice[]> = `${C[number]["value"]}`;

type OptionsArg = readonly Choice[] | EnumSource;
type Picked<O, Fallback> = O extends readonly Choice[] ? ChoiceValue<O> : Fallback;

function setOptions(field: Field, options: OptionsArg): void {
	field.set("options", normalizeOptions(choicesOf(options as Choice[] | EnumSource)));
}

/** Fixed-option radio group (Radio.php). */
export class Radio<N extends string = string, T = string> extends Field<N, T | null> {
	readonly kind = "radio";

	/** `{value, label, description?, disabled?}` entries, or an enum source. */
	options<const O extends OptionsArg>(options: O): WithValue<this, Picked<O, string> | null> {
		setOptions(this, options);
		return this as WithValue<this, Picked<O, string> | null>;
	}

	/** Horizontal layout instead of the default stacked list. */
	inline(value = true): this {
		return this.set("inline", value);
	}

	/** Yes/No shorthand ("1"/"0"); a no-op once options() is set. */
	boolean(): WithValue<this, "1" | "0" | null> {
		if (this.optionValue("options") === undefined) {
			this.options([
				{ value: "1", label: "Yes" },
				{ value: "0", label: "No" },
			]);
		}
		return this as WithValue<this, "1" | "0" | null>;
	}
}

/** A checkbox per option; submits the checked values (CheckboxList.php). */
export class CheckboxList<N extends string = string> extends Field<N, string[] | null> {
	readonly kind = "checkboxlist";

	/** `{value, label, description?, disabled?}` entries, or an enum source. */
	options<const O extends OptionsArg>(options: O): WithValue<this, Picked<O, string>[] | null> {
		setOptions(this, options);
		return this as WithValue<this, Picked<O, string>[] | null>;
	}
}

/** Segmented buttons, single or multiple (ToggleButtons.php). */
export class ToggleButtons<N extends string = string> extends Field<N, string | string[] | null> {
	readonly kind = "togglebuttons";

	/** `{value, label, description?, disabled?}` entries, or an enum source. */
	options<const O extends OptionsArg>(options: O): this {
		setOptions(this, options);
		return this;
	}
}
export interface ToggleButtons<N extends string = string> extends Multiple {}
mixin(ToggleButtons, [Multiple]);

/** Filter-bar only: multi-value fixed options applied as WHERE IN (InFilter.php). */
export class InFilter<N extends string = string> extends Field<N, string[] | null> {
	readonly kind = "in";

	/** `{value, label}` entries, or an enum source. */
	options<const O extends OptionsArg>(options: O): this {
		setOptions(this, options);
		return this;
	}
}

export type OptionRow = { value: unknown; label: string; display?: Choice["display"] };
export type OptionsQuery = (
	deps: Record<string, string>,
	search: string,
) => OptionRow[] | Record<string, string> | Promise<OptionRow[] | Record<string, string>>;
export type ResolveLabel = (
	value: string,
) => string | Omit<OptionRow, "value"> | null | Promise<string | Omit<OptionRow, "value"> | null>;

/** Dropdown: static options, an async query, creatable (Select.php). */
export class Select<N extends string = string, T = string> extends Field<N, T | null> {
	readonly kind = "select";
	private queryFn?: OptionsQuery;
	private resolveFn?: ResolveLabel;
	private createFn?: (validated: Record<string, unknown>) => unknown;
	private createFields: Field[] = [];

	/** `{value, label, description?, disabled?, display?}` entries, or an enum source. */
	options<const O extends OptionsArg>(options: O): WithValue<this, Picked<O, string> | null> {
		setOptions(this, options);
		return this as WithValue<this, Picked<O, string> | null>;
	}

	/** A filterable combobox; with query() the term reaches the closure. */
	searchable(value = true): this {
		return this.set("searchable", value);
	}

	/** Async options from the select-options endpoint: `(deps, search) => rows | {value: label}`. */
	query(fn: OptionsQuery): this {
		this.queryFn = fn;
		return this.set("async", true);
	}

	/** Resolves a stored value to its label when query() cannot. */
	resolveUsing(fn: ResolveLabel): this {
		this.resolveFn = fn;
		return this;
	}

	/** Create options on the fly: a mini-form plus `(validated) => {value, label}`. */
	creatable(fields: Field[], using: (validated: Record<string, unknown>) => unknown): this {
		this.createFn = using;
		this.createFields = fields;
		this.opts.create = { fields: fields.filter(includes).map((f) => f.toNode()) };
		return this;
	}

	queryClosure(): OptionsQuery | undefined {
		return this.queryFn;
	}

	resolveClosure(): ResolveLabel | undefined {
		return this.resolveFn;
	}

	creatableClosure(): ((validated: Record<string, unknown>) => unknown) | undefined {
		return this.createFn;
	}

	creatableFields(): Field[] {
		return this.createFields;
	}
}
export interface Select<N extends string = string, T = string>
	extends Affixes,
		DatabaseRules,
		Dependencies,
		Multiple {}
mixin(Select, [Affixes, DatabaseRules, Dependencies, Multiple]);
