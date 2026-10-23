import { Affixes } from "./affix";
import { mixin, NumericRules } from "./concerns";
import { Field } from "./field";

/** Numeric input (Number.php). */
export class NumberField<N extends string = string> extends Field<N, number | null> {
	readonly kind = "number";

	/** Placeholder text shown in the empty input. */
	placeholder(text: string): this {
		return this.set("placeholder", text);
	}

	/** Increment granularity (the input's step attribute); 'any' allows arbitrary precision. */
	step(step: number | "any"): this {
		if (typeof step === "string" && step !== "any") {
			throw new Error('Number::step() only accepts a number or the string "any".');
		}
		return this.set("step", step);
	}
}
export interface NumberField<N extends string = string> extends Affixes, NumericRules {}
mixin(NumberField, [Affixes, NumericRules]);

/** Range slider (Slider.php). */
export class Slider<N extends string = string> extends Field<N, number | null> {
	readonly kind = "slider";

	/** Lowest selectable value (drives the track range). */
	min(value: number): this {
		return this.set("min", value);
	}

	/** Highest selectable value (drives the track range). */
	max(value: number): this {
		return this.set("max", value);
	}

	/** Granularity of each thumb move. */
	step(value: number): this {
		return this.set("step", value);
	}
}
export interface Slider<N extends string = string> extends NumericRules {}
mixin(Slider, [NumericRules]);

/** On/off toggle (Boolean.php). */
export class BooleanField<N extends string = string> extends Field<N, boolean> {
	readonly kind = "boolean";
}

/** Single checkbox (Checkbox.php). */
export class Checkbox<N extends string = string> extends Field<N, boolean> {
	readonly kind = "checkbox";
}

/** Color picker (Colorpicker.php). */
export class Colorpicker<N extends string = string> extends Field<N, string | null> {
	readonly kind = "colorpicker";
}

/** Key/value pairs editor (Keyvalue.php). */
export class Keyvalue<N extends string = string> extends Field<N, Record<string, string> | null> {
	readonly kind = "keyvalue";
}

/** Free-form tag list (Tags.php). */
export class Tags<N extends string = string> extends Field<N, string[] | null> {
	readonly kind = "tags";
}
