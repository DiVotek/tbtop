import { CheckboxList, InFilter, Radio, Select, ToggleButtons } from "./fields/choices";
import type { Field } from "./fields/field";
import { MediaPicker, Upload } from "./fields/files";
import { Relation, Repeater } from "./fields/nested";
import {
	BooleanField,
	Checkbox,
	Colorpicker,
	Keyvalue,
	NumberField,
	Slider,
	Tags,
} from "./fields/numbers";
import { Richtext } from "./fields/richtext";
import { Otp, Password, Slug, Text, Textarea } from "./fields/strings";
import { DateField, Daterange, Datetime, Time } from "./fields/temporal";

type FieldClass = new (name: string) => Field;

const BUILT_IN: Record<string, FieldClass> = {
	text: Text,
	textarea: Textarea,
	password: Password,
	otp: Otp,
	number: NumberField,
	date: DateField,
	datetime: Datetime,
	boolean: BooleanField,
	select: Select,
	radio: Radio,
	tags: Tags,
	in: InFilter,
	checkbox: Checkbox,
	colorpicker: Colorpicker,
	keyvalue: Keyvalue,
	slug: Slug,
	upload: Upload,
	media: MediaPicker,
	relation: Relation,
	repeater: Repeater,
	richtext: Richtext,
	daterange: Daterange,
	checkboxlist: CheckboxList,
	togglebuttons: ToggleButtons,
	slider: Slider,
	time: Time,
};

const kinds = new Map<string, FieldClass>(Object.entries(BUILT_IN));

/** Register a custom field kind (S::register); reach it with `s.field(kind, name)`. */
export function registerField(kind: string, fieldClass: FieldClass): void {
	kinds.set(kind, fieldClass);
}

/** Instantiate a field by kind string (S::makeField). */
export function makeField(kind: string, name: string): Field {
	const fieldClass = kinds.get(kind);
	if (fieldClass === undefined) {
		throw new Error(`Unknown field kind "${kind}".`);
	}
	return new fieldClass(name);
}

export function builtInKinds(): string[] {
	return Object.keys(BUILT_IN);
}

/** The field factories of S, one per wire kind; the name is a literal type. */
export class FieldKinds {
	text<const N extends string>(name: N): Text<N> {
		return new Text(name);
	}

	textarea<const N extends string>(name: N): Textarea<N> {
		return new Textarea(name);
	}

	password<const N extends string>(name: N): Password<N> {
		return new Password(name);
	}

	otp<const N extends string>(name: N): Otp<N> {
		return new Otp(name);
	}

	number<const N extends string>(name: N): NumberField<N> {
		return new NumberField(name);
	}

	date<const N extends string>(name: N): DateField<N> {
		return new DateField(name);
	}

	datetime<const N extends string>(name: N): Datetime<N> {
		return new Datetime(name);
	}

	time<const N extends string>(name: N): Time<N> {
		return new Time(name);
	}

	daterange<const N extends string>(name: N): Daterange<N> {
		return new Daterange(name);
	}

	boolean<const N extends string>(name: N): BooleanField<N> {
		return new BooleanField(name);
	}

	select<const N extends string>(name: N): Select<N> {
		return new Select(name);
	}

	radio<const N extends string>(name: N): Radio<N> {
		return new Radio(name);
	}

	tags<const N extends string>(name: N): Tags<N> {
		return new Tags(name);
	}

	checkbox<const N extends string>(name: N): Checkbox<N> {
		return new Checkbox(name);
	}

	colorpicker<const N extends string>(name: N): Colorpicker<N> {
		return new Colorpicker(name);
	}

	keyvalue<const N extends string>(name: N): Keyvalue<N> {
		return new Keyvalue(name);
	}

	slug<const N extends string>(name: N): Slug<N> {
		return new Slug(name);
	}

	upload<const N extends string>(name: N): Upload<N> {
		return new Upload(name);
	}

	media<const N extends string>(name: N): MediaPicker<N> {
		return new MediaPicker(name);
	}

	relation<const N extends string>(name: N): Relation<N> {
		return new Relation(name);
	}

	repeater<const N extends string>(name: N): Repeater<N> {
		return new Repeater(name);
	}

	richtext<const N extends string>(name: N): Richtext<N> {
		return new Richtext(name);
	}

	checkboxlist<const N extends string>(name: N): CheckboxList<N> {
		return new CheckboxList(name);
	}

	togglebuttons<const N extends string>(name: N): ToggleButtons<N> {
		return new ToggleButtons(name);
	}

	slider<const N extends string>(name: N): Slider<N> {
		return new Slider(name);
	}

	/** Filter-bar only: multi-value WHERE IN. */
	inFilter<const N extends string>(name: N): InFilter<N> {
		return new InFilter(name);
	}

	/** A registered custom kind (registerField), e.g. `s.field('rating', 'score')`. */
	field(kind: string, name: string): Field {
		return makeField(kind, name);
	}
}
