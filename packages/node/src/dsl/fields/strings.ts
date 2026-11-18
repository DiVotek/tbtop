import { Affixes } from "./affix";
import { DatabaseRules, InputMode, mixin, StringRules } from "./concerns";
import { Field } from "./field";

/** One placeholder, or one per content locale (HasLocalePlaceholder.php). */
export type LocalePlaceholder = string | Record<string, string>;

function checkedPlaceholder(text: LocalePlaceholder): LocalePlaceholder {
	if (typeof text === "string") {
		return text;
	}
	const valid =
		text !== null &&
		typeof text === "object" &&
		!Array.isArray(text) &&
		Object.values(text).every((v) => typeof v === "string");
	if (!valid) {
		throw new Error("A placeholder locale map needs locale keys and string values.");
	}
	return text;
}

/** Single-line text input (Text.php). */
export class Text<N extends string = string> extends Field<N, string | null> {
	readonly kind = "text";

	/** Fixed input mask: `9` digit, `a` letter, `*` alphanumeric, anything else literal. */
	mask(pattern: string): this {
		return this.set("mask", pattern);
	}

	/**
	 * Placeholder text shown in the empty input. Pass a locale map
	 * (`{ en: "Page title", uk: "Назва сторінки" }`) on a translatable field to
	 * show each locale's text on its own tab; a missing locale shows none.
	 */
	placeholder(text: LocalePlaceholder): this {
		return this.set("placeholder", checkedPlaceholder(text));
	}
}
export interface Text<N extends string = string>
	extends Affixes,
		DatabaseRules,
		InputMode,
		StringRules {}
mixin(Text, [Affixes, DatabaseRules, InputMode, StringRules]);

/** Multi-line text input (Textarea.php). */
export class Textarea<N extends string = string> extends Field<N, string | null> {
	readonly kind = "textarea";

	/** Placeholder text shown in the empty textarea; a locale map as on Text. */
	placeholder(text: LocalePlaceholder): this {
		return this.set("placeholder", checkedPlaceholder(text));
	}
}
export interface Textarea<N extends string = string> extends StringRules {}
mixin(Textarea, [StringRules]);

/** What a secret() password shows: whether a value is stored, Clear, the preview. */
export interface SecretState {
	filled: boolean;
	clearable?: true;
	preview?: string;
}

/** Masked password input (Password.php). */
export class Password<N extends string = string> extends Field<N, string | null> {
	readonly kind = "password";
	private secretFlag = false;
	private clearableFlag = false;
	private previewFn?: (value: string) => string;
	/** What the form's record holds for this field, seeded by FormBuilder; never serialized. */
	private stored: unknown = null;

	/**
	 * Keeps a stored value out of the browser: the record's value never ships,
	 * the form shows whether one is set with a Replace button, and a field the
	 * user leaves alone is absent from the submitted data. For a top-level form
	 * field (sections and tabs included), not a repeater sub-field.
	 */
	secret(state = true): this {
		this.secretFlag = state;
		return this;
	}

	/**
	 * Adds a Clear button to a secret() field; clearing submits `null`. Without
	 * it a `null` for this field is dropped on the server. Implies secret().
	 * Not shown on a required() field.
	 */
	clearable(state = true): this {
		this.clearableFlag = state;
		return state ? this.secret() : this;
	}

	/** `(value) => string` shown beside the "Set" badge; only its result reaches the browser. Implies secret(). */
	preview(fn: (value: string) => string): this {
		this.previewFn = fn;
		return this.secret();
	}

	isSecret(): boolean {
		return this.secretFlag;
	}

	isClearable(): boolean {
		return this.secretFlag && this.clearableFlag;
	}

	/** Whether the seeded record holds a value for this field. */
	hasStoredValue(): boolean {
		const v = this.stored;
		return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
	}

	/** Called by FormBuilder with the record's raw value before the record is stripped. */
	seedStored(value: unknown): void {
		this.stored = value;
	}

	/** `nullable` so a clear passes, `sometimes` once stored so `required` holds while left alone. */
	override ruleEntries(): string[] {
		const rules = super.ruleEntries();
		if (!this.secretFlag) {
			return rules;
		}
		const marker = this.hasStoredValue() ? ["sometimes", "nullable"] : ["nullable"];
		return [...new Set([...marker, ...rules])];
	}

	override toNode() {
		if (this.secretFlag) {
			this.opts.secret = this.secretState();
		} else {
			delete this.opts.secret;
		}
		return super.toNode();
	}

	private secretState(): SecretState {
		const state: SecretState = { filled: this.hasStoredValue() };
		if (this.isClearable() && !super.ruleEntries().includes("required")) {
			state.clearable = true;
		}
		if (this.previewFn !== undefined && typeof this.stored === "string" && this.stored !== "") {
			const text: unknown = this.previewFn(this.stored);
			if (typeof text !== "string") {
				throw new TypeError(`password "${this.name}": preview() must return a string.`);
			}
			state.preview = text;
		}
		return state;
	}
}
export interface Password<N extends string = string> extends StringRules {}
mixin(Password, [StringRules]);

/** URL slug, generated from another field while typing (Slug.php). */
export class Slug<N extends string = string> extends Field<N, string | null> {
	readonly kind = "slug";

	/** Source field the slug derives from; `title.en` pins one locale. */
	fromField(fieldName: string): this {
		return this.set("fromField", fieldName);
	}
}
export interface Slug<N extends string = string> extends StringRules {}
mixin(Slug, [StringRules]);

/** One-time code slots (Otp.php). */
export class Otp<N extends string = string> extends Field<N, string | null> {
	readonly kind = "otp";

	/** Slot count; also a server `digits:N` rule, replaced on a second call. */
	length(digits = 6): this {
		this.set("length", digits);
		this.replaceRules(this.ruleEntries().filter((rule) => !rule.startsWith("digits:")));
		return this.rules(`digits:${digits}`);
	}

	/** Client-side accepted-character regex; defaults to digits-only. */
	pattern(regex: string): this {
		return this.set("pattern", regex);
	}
}
